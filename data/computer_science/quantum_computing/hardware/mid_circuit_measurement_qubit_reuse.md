### Mid-Circuit Measurement and Qubit Reuse

**What it is:** The ability to measure a qubit partway through a circuit, optionally reset it, and continue using it (or its neighbors) for further gates — without destroying the rest of the quantum state. Enables dynamic circuits, real-time feedback, and **qubit reuse** (run a larger logical circuit on fewer physical qubits by recycling measured qubits).

**Why it matters:**
- **QEC:** surface/LDPC codes demand measuring ancillas each cycle while data qubits continue coherently.
- **Dynamic circuits:** if-then-else based on measurement outcome (teleportation, adaptive phase estimation, MBQC).
- **Qubit reuse:** a Bernstein–Vazirani or QAOA pass with deep history can reuse bits; ~2× qubit-count savings typical.
- **Heralded protocols:** discard runs where an erasure is detected → higher effective fidelity.

**Two flavors:**

| Feature | Destructive readout only | Mid-circuit + reset + reuse |
|---|---|---|
| Measurement returns classical bit | Yes | Yes |
| State of measured qubit afterward | Undefined / collapsed / ignored | Known (|0⟩ after reset), reusable |
| Other qubits stay coherent? | End of circuit, moot | Must stay coherent during ~ μs readout |
| Real-time classical branching | No | Yes (dynamic circuits, c_if in Qiskit, cond in OpenQASM 3) |

**Hardware requirements:**
1. **Readout that doesn't disturb neighbors.** Usually via Purcell-filtered resonator per qubit; readout-induced dephasing on neighbors < 0.01 rad.
2. **Fast readout.** SC target ~ 200–500 ns (total integration + discrimination); ion traps ~ 100–500 μs.
3. **Active reset.** Unconditional reset (measure + conditional X + re-measure) or parametric reset to cavity. Typical residual `|1⟩` population after reset < 1%.
4. **Classical feedback loop.** Latency from measurement → next pulse must be < decoherence time of spectators. SC target: < 1 μs.

**Platform maturity:**

| Platform | MCM available | Notes |
|---|---|---|
| Superconducting (IBM Heron, Google Willow) | Yes | ~300 ns readout + ~500 ns reset; dynamic circuits in Qiskit |
| Trapped ion (Quantinuum H-series, QCCD) | Yes — native | Ion transport isolates measured ions; high fidelity (> 99.9%) |
| Neutral atoms (e.g. QuEra Aquila) | Emerging | Array selective readout harder; atom loss complicates reuse |
| Photonic | Native | Photon-number-resolving detection; but no reset — photon is consumed |
| Spin qubits | Emerging | Pauli spin blockade readout; slow reset via reservoir |

**QCCD ion-trap reuse (canonical example):** Ions are physically transported between memory and gate zones. A measurement zone reads out selected ions via fluorescence (microseconds), optically-pumps them back to `|0⟩`, and then they are shuttled back for further gates. Neighbors are quiescent in memory zones — photon scatter is the main crosstalk path.

**SC measurement crosstalk pitfall:** Dispersive readout injects a ~5–8 GHz probe into the feedline shared with neighboring qubits' resonators. Without isolation:
- Readout-induced AC-Stark on neighbors → coherent phase error.
- Photon leakage into neighbor resonators → dephasing.
Mitigations: bandpass Purcell filters per qubit, temporal sequencing (not all qubits read simultaneously), dynamical decoupling on spectators during read.

**Qubit-reuse example (pattern):**
```
# Measure ancilla, reuse it later for a different role
with circuit.if_test((cbit, 1)):
    circuit.x(data_q)    # Dynamic correction
circuit.reset(ancilla_q)
circuit.h(ancilla_q)     # Ancilla reused for next teleport
```
Compilers (Qiskit `OptimizeMidCircuitMeasurement`, CUDA-Q) can automatically detect reuse opportunities in circuits whose lifetime graph has small cuts.

**Trade-offs:**
- **Pro:** Effective qubit count scales by the degree of reuse (2–4× typical for NISQ benchmarks).
- **Pro:** Required for fault-tolerant operation — no FT without MCM.
- **Con:** Each readout costs wall-clock time; deep MCM circuits are dominated by readout.
- **Con:** Reset error (~ 0.5–2%) counts as SPAM on every reuse cycle.
- **Con:** Measurement crosstalk is platform-specific and can cap fidelity below RB numbers.

**When relevant:**
- Any QEC experiment.
- Circuits with N_logical > N_physical but narrow causal cone (QAOA, VQE with mid-measurement).
- Adaptive algorithms (QPE with QFT-free feedback, MBQC).

**Pitfalls:**
- Assuming measurement fidelity is the same simultaneously vs. isolated.
- Ignoring readout-induced dephasing of the still-coherent qubits.
- Compiler does not know real `τ_meas + τ_reset` — user may have to hint or insert delays.

**Rule of thumb:** If your platform reports a "mid-circuit measurement fidelity" in isolation, immediately ask for simultaneous MCM fidelity and spectator dephasing — those are the numbers that determine whether qubit reuse or QEC actually works.
