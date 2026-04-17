### Fault-Tolerant Syndrome Extraction — Rounds, History, Decoder

**What it is:** The protocol by which a stabilizer code *repeatedly* measures its stabilizer generators in a way that tolerates errors in the measurement circuitry itself. Key ideas: (1) one round of syndrome measurement is unreliable (measurement errors mimic data errors), (2) repeating for `d` rounds and decoding the 3D *spacetime* syndrome history lets the decoder distinguish transient measurement flips from real data errors.

**The problem:** A naive single round of stabilizer measurement reports the syndrome, but a single fault on the ancilla qubit can flip the measurement outcome without any data-qubit error being present. Decoder acts on false info → introduces an error. Shor 1996 showed you must repeat.

**The fix — spacetime syndrome:**
- Run `d` rounds of stabilizer measurement (for a distance-`d` code).
- Compute *detection events*: `ΔS_t = S_t ⊕ S_{t-1}` (XOR with previous round).
- A data error gives a *persistent* change (detectors fire at the space-time location of the error).
- A measurement error gives a *transient* change (pair of detectors firing at adjacent times, same location).
- Decoder works on the full `d × (#stabilizers)` detector grid, matching endpoints through spacetime.

**Distance-`d` requires `d` rounds:** Intuitively, `d` rounds gives `d` time-slices, enough that a chain of `⌊d/2⌋` measurement errors cannot fake a logical string. Formally, the *effective distance* of the combined spacetime code is `d` only when `T ≥ d`.

**Stim code — surface code memory, d rounds:**
```python
import stim, pymatching

c = stim.Circuit.generated(
    code_task="surface_code:rotated_memory_z",
    distance=5,
    rounds=5,                                    # = d rounds
    after_clifford_depolarization=0.001,
    before_round_data_depolarization=0.001,
    before_measure_flip_probability=0.001,
)
detector_error_model = c.detector_error_model(decompose_errors=True)
matching = pymatching.Matching.from_detector_error_model(detector_error_model)

sampler = c.compile_detector_sampler()
shots = sampler.sample(shots=10000, append_observables=True)
detectors, obs = shots[:, :-1], shots[:, -1]
predictions = matching.decode_batch(detectors)
print("logical error rate:", (predictions != obs).mean())
```

**Extraction circuits — trade-offs:**

| Circuit type | Ancilla qubits / stabilizer | Rounds to measure | FT? |
|---|---|---|---|
| Shor-style (cat-state ancilla) | `w` (stabilizer weight) | 1 | Yes |
| Steane-style (code-state ancilla) | 1 full logical block | 1 | Yes, high cost |
| Knill-style (teleportation) | 2 logical blocks | 2 | Yes, high cost |
| **Ancilla-per-stabilizer + flag qubits** | 1 + small flags | 1 (with flag retry) | Yes |
| Standard surface code (single ancilla + CNOT tree) | 1 | 1 per round | Yes because of repetition |

**Decoder-latency constraint:**
Decoding must complete within the coherence budget. For a superconducting surface-code patch with ~1μs syndrome round, decoder must output corrections in `<< 1μs × d` wall time, else logical circuit stalls or breaks FT.

| Decoder | Latency (d=11) | Accuracy |
|---|---|---|
| MWPM (PyMatching) | ~ms on CPU | Near-optimal |
| Union-Find | ~10s of μs | Slightly worse |
| Sparse-blossom (Fowler, streaming) | μs on FPGA | Near-optimal |
| Neural-net (AlphaQubit) | μs on TPU | Best published |

**Pitfalls:**
- "Hook errors" — one fault on the ancilla propagates to two data errors through the CNOT tree → can reduce effective distance. Carefully chosen CNOT schedules (ZXZX, N-shape) suppress hooks.
- Leakage (qubit escapes computational subspace) is **not detected** by standard stabilizer measurement — needs dedicated leakage reduction units.
- Syndrome extraction itself is the noise-dominant operation — most errors in a FT circuit come from syndrome-round infidelities, not idle decoherence.

**Rule of thumb:** Decoder latency must be `<` coherence-time × round-time, else the queue grows unboundedly. For superconducting at 1μs/round, you need streaming decoders running on dedicated silicon — and `d` full rounds of history before trusting any syndrome.
