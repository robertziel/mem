### Decoherence: T1 and T2 (Relaxation and Dephasing)

**What it is:** Decoherence is the loss of quantum information to the environment. It has two fundamental timescales: T1 (energy relaxation) and T2 (phase coherence). Together they bound how long a qubit can store a superposition.

**T1 — energy relaxation (amplitude damping):**
- Spontaneous decay |1⟩ → |0⟩ by emitting energy to the bath.
- Population decay: P(|1⟩, t) = P(|1⟩, 0) · exp(−t/T1).
- Measured by preparing |1⟩, waiting time t, then reading out.

**T2 — dephasing (loss of coherence):**
- Random phase accumulation scrambles |+⟩ = (|0⟩+|1⟩)/√2 → mixed state.
- Off-diagonal density-matrix elements ρ_01 decay: ρ_01(t) = ρ_01(0) · exp(−t/T2).
- Measured via Ramsey (free evolution) or Hahn echo (echoed T2^echo refocuses low-frequency noise).

**Fundamental bound:**

> T2 ≤ 2·T1

Equality holds when pure dephasing is absent (T_φ = ∞). General decomposition: 1/T2 = 1/(2T1) + 1/T_φ.

**Typical values (2024–2026 era):**

| Platform | T1 | T2 (echo) | Gate time |
|---|---|---|---|
| Superconducting transmon (IBM, Google) | 100–400 μs | 100–300 μs | 20–500 ns |
| Fluxonium (AWS, Atlantic Q) | 300 μs–1 ms | 200–700 μs | 50–200 ns |
| Trapped ion (IonQ, Quantinuum) | > 10 s | 1–10 s | 10–100 μs |
| Neutral atom (QuEra, Pasqal) | 1–4 s | 1–2 s | 100 ns–1 μs |
| NV center (diamond) | ms at room T | 1 ms (isotopically pure) | 10–100 ns |

**Physical mechanisms:**
- **Transmon T1:** dielectric loss in substrate, two-level-system (TLS) defects, Purcell decay into readout resonator, quasiparticle tunneling.
- **Transmon T2:** charge noise (exponentially suppressed by E_J/E_C ratio), flux noise 1/f, photon-number fluctuations in dispersive readout.
- **Trapped ion T2:** magnetic-field fluctuations on Zeeman/hyperfine transitions; clock qubits (m_F = 0) are first-order field insensitive.

**Quality factor / coherence budget:**
- Number of gates possible ≈ T2 / t_gate.
- Transmon: 300 μs / 100 ns ≈ 3000 gates (before ~37% fidelity remains).
- Trapped ion: 10 s / 50 μs ≈ 200 000 gates.

**Qiskit noise model sketch:**
```python
from qiskit_aer.noise import thermal_relaxation_error, NoiseModel
t1, t2, tg = 150e-6, 120e-6, 50e-9   # seconds
err_1q = thermal_relaxation_error(t1, t2, tg)
nm = NoiseModel()
nm.add_all_qubit_quantum_error(err_1q, ['sx','x','rz'])
```

**Mitigations (not full QEC):**
- Dynamical decoupling (XY-4, CPMG) refocuses slow dephasing.
- Sweet spots in flux space (transmon at φ = 0).
- Cryogenic isolation, magnetic shielding, 3D cavities.

**Rule of thumb:** T2 ≤ 2T1 always; useful circuit depth ≈ T2 / t_gate; if 1/T_φ dominates T2, fight it with echoes before you invest in better materials.
