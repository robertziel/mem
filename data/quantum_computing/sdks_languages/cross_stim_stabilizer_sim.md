### Stim — High-Speed Stabilizer Simulator for QEC

**What it is:**
Stim (Craig Gidney, Google Quantum AI) is a C++/Python stabilizer-formalism simulator optimized ruthlessly for one job: sampling from **Clifford circuits with Pauli noise**, very fast, at very large scale. Because it restricts itself to stabilizer mechanics, it can simulate **millions of qubits** and **billions of gates** where a statevector simulator would run out of memory at 35. This makes it the default engine for quantum-error-correction (QEC) research: surface codes, color codes, repetition codes, Floquet codes, and the hardware-level noise-floor analysis around them.

**Core objects:**

| Object | Role |
|---|---|
| `stim.Circuit` | Instruction list with Clifford gates, Pauli noise, detectors, observables |
| `stim.CompiledMeasurementSampler` | Samples bitstrings from the circuit |
| `stim.CompiledDetectorSampler` | Samples detector values for decoding |
| `stim.DetectorErrorModel` | DEM — the "graph" consumed by decoders like PyMatching |
| `stim.TableauSimulator` | Step-by-step stabilizer state tracker |

**Allowed operations:**

| Category | Examples |
|---|---|
| Clifford gates | `H`, `S`, `CX`, `CZ`, `SWAP`, Pauli frames |
| Measurements | `M`, `MX`, `MY`, `MR`, `MPP` (Pauli-product) |
| Noise channels | `DEPOLARIZE1`, `DEPOLARIZE2`, `X_ERROR`, `Y_ERROR`, `Z_ERROR`, `PAULI_CHANNEL_1/2` |
| Bookkeeping | `DETECTOR`, `OBSERVABLE_INCLUDE`, `SHIFT_COORDS`, `TICK` |

Non-Clifford gates (T, Toffoli, arbitrary rotations) are **not** supported. That's the price of speed.

**API shape:**
```python
import stim

circuit = stim.Circuit("""
    R 0 1 2
    H 0
    CX 0 1
    CX 1 2
    X_ERROR(0.01) 0 1 2
    M 0 1 2
    DETECTOR rec[-3] rec[-2]
    DETECTOR rec[-2] rec[-1]
    OBSERVABLE_INCLUDE(0) rec[-1]
""")

sampler = circuit.compile_detector_sampler()
dets, obs = sampler.sample(shots=1_000_000, separate_observables=True)
# dets.shape == (1_000_000, 2), obs.shape == (1_000_000, 1)
```

**Surface code in one call:**
```python
surface = stim.Circuit.generated(
    "surface_code:rotated_memory_z",
    distance=7,
    rounds=7,
    after_clifford_depolarization=0.001,
    after_reset_flip_probability=0.01,
    before_measure_flip_probability=0.01,
    before_round_data_depolarization=0.001,
)
dem = surface.detector_error_model(decompose_errors=True)
# Feed `dem` into PyMatching / BP-OSD / Google's Belief-Prop for decoding.
```

**Why it outperforms statevector sims by 10–12 orders of magnitude:**

| Simulator | Memory for N qubits | Clifford gate cost |
|---|---|---|
| Statevector | `O(2^N)` complex floats | `O(2^N)` |
| Density matrix | `O(4^N)` | `O(4^N)` |
| Stim (stabilizer) | `O(N^2)` bits (tableau) | `O(N)` amortized per Pauli-sparse gate |

On a laptop, Stim simulates a distance-15 surface code (thousands of qubits, 15 rounds, noisy) in seconds per million shots.

**Typical QEC workflow:**
1. Build a noisy memory or logical-gate circuit (`Circuit.generated(...)` or hand-authored).
2. Extract a `DetectorErrorModel` with `decompose_errors=True`.
3. Hand the DEM to a decoder — PyMatching for surface-code MWPM, BP-OSD for LDPC codes, Google's internal belief-prop for Floquet variants.
4. Sample detectors with Stim, decode, compare against `OBSERVABLE_INCLUDE` ground truth, compute logical error rate.
5. Sweep noise strength / code distance to plot the threshold curve.

**Pitfalls:**
- Inserting a non-Clifford gate (e.g. `T 0`) raises immediately — Stim does *not* try to approximate. Decompose upstream or switch simulators.
- `DETECTOR` arguments use `rec[-k]` indexing over the most recent measurement record; getting the offsets wrong yields silent bias, not errors.
- Pauli noise in Stim is *applied at a point*, not a continuous-time channel — a `DEPOLARIZE1(p)` on a line by itself does nothing without measurements/detectors downstream.
- DEM generation with `decompose_errors=True` can blow up for dense graphs; try `approximate_disjoint_errors=True` for very large circuits.

**Rule of thumb:** Reach for Stim the moment you're sampling or decoding a Clifford+noise circuit — especially any surface/color/Floquet code or any hardware-level noise-floor study — and keep statevector simulators for small non-Clifford algorithmic work where stabilizer simulation doesn't apply.
