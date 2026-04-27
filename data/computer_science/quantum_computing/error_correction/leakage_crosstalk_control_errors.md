### Leakage, Crosstalk, and Classical Control Errors

**What they are:** Non-Pauli, non-stochastic errors that violate the assumptions of standard QEC and the threshold theorem. They must be converted into Pauli-like errors (by LRU, Pauli frame tracking, etc.) before a stabilizer code can correct them.

**1. Leakage (out-of-qubit-subspace errors):**

A qubit is a 2-level subspace embedded in a larger Hilbert space.
- **Transmon:** computational {|0⟩, |1⟩}, leakage level |2⟩ (and |3⟩). Anharmonicity α ≈ −200 to −300 MHz sets leakage risk.
- **Neutral atom:** leakage to Rydberg-blockade failure states or ground-state manifolds outside the qubit choice.
- **Trapped ion:** leakage to other Zeeman/hyperfine sublevels.

Leakage is not detectable by stabilizer syndromes (those only see Paulis in {0,1} subspace) — so uncorrected leakage accumulates and destroys the code.

**Leakage reduction (LRU):**
- Insert swap-to-|0⟩ pumping on ancillas every round.
- Google Willow uses LRU cycles in surface-code experiments; residual leakage < 1e-3 per round (2024).
- Software: DRAG pulse shaping (Derivative Removal by Adiabatic Gate) suppresses |1⟩→|2⟩ drive during X, SX gates.

**Leakage rate budget (superconducting):**

| Source | Per-gate rate |
|---|---|
| Single-qubit (DRAG optimized) | 1e-5 to 1e-4 |
| Two-qubit CZ | 1e-4 to 1e-3 |
| Readout (measurement-induced) | 1e-4 to 1e-3 |
| Spontaneous (thermal) | 1e-5 per μs |

**2. Crosstalk (unwanted inter-qubit coupling):**

Kinds:
- **Static ZZ crosstalk:** always-on coupling shifts idle qubit frequency conditional on neighbor's state. Transmon–transmon ZZ ≈ 10–200 kHz.
- **Driven crosstalk:** microwave drive on qubit i rotates qubit j (classical; spectator error).
- **Measurement crosstalk:** readout pulse leaks into neighbor resonator, dephases or flips them.
- **TLS-mediated crosstalk:** shared defects couple non-neighbors.

**Characterization:** simultaneous RB (sim-RB), cross-resonance tomography, XY-Z map, IBM's "simultaneous layer fidelity."

**Mitigations:**
- Tunable couplers (Google, Rigetti): turn off ZZ when idle.
- Frequency allocation (collision-avoidance graph coloring) on fixed-coupling (IBM) chips.
- Echoed cross-resonance (ECR) cancels classical rotations.
- Dynamical decoupling on spectators during neighbor's gate.

**3. Classical control errors:**

Arise from the room-temperature electronics, not the qubit.
- **Amplitude miscalibration:** over/under rotation (over-rotation by angle ε ⇒ coherent error; gets squared into p ≈ ε²).
- **Phase (LO) drift:** rotates Z frame; accumulates over minutes-hours.
- **Timing jitter:** picosecond-level, matters when gate is 10s of ns.
- **AWG non-linearity:** distorts pulse shape, causes leakage and off-resonant errors.
- **Thermal drift of refrigerator:** shifts transmon frequencies via flux or TLS.

**Coherent vs stochastic distinction:**
- Stochastic: error probability adds linearly across N gates (p · N).
- Coherent: amplitudes add, error can scale as (ε·N)² — much worse before Pauli twirling.
- Randomized compiling / Pauli twirling (Wallman & Emerson 2016) converts coherent → stochastic.

**Qiskit Pulse example for DRAG:**
```python
from qiskit.pulse.library import Drag
pulse = Drag(duration=64, amp=0.2, sigma=16, beta=-0.8)  # beta cancels |1>->|2> leakage
```

**Rule of thumb:** Leakage is invisible to stabilizers — you must either design gates that don't leak or run LRU every QEC round; crosstalk is the hidden tax on "idle" qubits during a neighbor's gate; coherent control errors scale quadratically until you twirl them.
