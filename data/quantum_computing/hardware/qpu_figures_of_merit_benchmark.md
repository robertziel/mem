### QPU Figures of Merit — A Cross-Vendor Comparison Framework

**What it is:** The small set of device-level metrics you actually need to compare two QPUs (SC, ion, neutral atom, photonic) for whether they can run a given workload. Marketing specs ("1000 qubits") are insufficient; useful capacity is a function of several metrics together.

**Primary figures:**

| Metric | Symbol | Meaning | Typical "good" (2024 SOTA) |
|---|---|---|---|
| Qubit count | N | Usable addressable qubits on one QPU | 100–1000 |
| Connectivity | degree / path-length | Average / worst-case edges in 2Q graph | 3–4 (SC) to n−1 (ions) |
| Single-qubit fidelity | F_1Q | 1 − avg error per 1Q gate (RB) | 99.9% – 99.99% |
| Two-qubit fidelity | F_2Q | 1 − avg error per 2Q gate (RB / XEB) | 99.5% – 99.9% |
| SPAM | ε_SPAM | Combined state prep + measurement error | 0.5% – 5% |
| Coherence | T1, T2, T2* | Relaxation & dephasing times | T1: 100–300 μs (SC), 10s s (ions) |
| Gate time | τ_1Q, τ_2Q | Wall-clock per gate | 10–40 ns (SC), 1–100 μs (ions) |
| Crosstalk (sim-RB) | F_simult / F_indiv | Fidelity drop when neighbors drive | Δ < 0.2% is good |
| Reset time | τ_reset | Active reset latency | 0.2–1 μs (SC), 10 μs (ions) |
| Cycle time | τ_cycle | Full QEC round wall-clock | 1 μs (SC target), 100s μs (ions) |

**Derived / composite metrics:**

| Composite | Formula | What it captures |
|---|---|---|
| Coherence×gate-count | T_2 / τ_2Q | Max 2Q gates before decoherence ~ sets circuit depth |
| Quantum Volume (QV) | max d such that d×d random circuit passes heavy-output test | Effective "square depth" — IBM-defined |
| CLOPS | Circuit Layer Operations Per Second | Throughput (layers/sec) with overhead |
| Algorithmic Qubits (AQ) | IonQ metric combining N, F, connectivity | Useful circuits one can run |
| Error per layered circuit (layer fidelity) | Σ error across a parallel layer | Realistic per-step error |

**Why single numbers mislead:**
- "1000 qubits" @ 98% 2Q means max useful depth ≈ 50 before probability < 1/e. Effectively a ~30-qubit useful machine.
- "All-to-all" connectivity on ions comes with 100× longer gate time — so `T_2/τ_2Q` is the honest comparison, not raw topology.

**Per-gate-budget sanity calc:**
```
successful_circuit_prob ≈ exp(−n_2Q · ε_2Q − n_1Q · ε_1Q − n_meas · ε_SPAM)
with ε_2Q = 1e-3, n_2Q = 1000  ⇒  exp(−1) ≈ 0.37
⇒ ε_2Q · n_2Q ≈ 1 is the heuristic break-even for NISQ circuits
```

**Comparison framework (for a workload):**
1. Write circuit in a topology-agnostic form. Count: N, depth, n_1Q, n_2Q, n_meas.
2. For each candidate QPU:
   - Check N ≥ required.
   - Transpile to its connectivity → get actual `n_2Q_device` (usually inflated by SWAPs).
   - Compute `ε_total = n_2Q_device · ε_2Q + ...`
   - Check wall-clock: `depth · τ_2Q < T_2 / 10`.
3. Pick the machine whose `ε_total` is smallest, not whose N is largest.

**Trade-offs between metrics:**
- SC transmons: fast gates (ns), short coherence (μs). High throughput, low depth.
- Ion traps (Quantinuum, IonQ): slow gates (μs–ms), huge coherence (s–min). Lower throughput, deeper circuits.
- Neutral atoms: medium gates (μs), very high N (≈ 1000 atoms demoed), geometric trade-offs with Rydberg blockade.
- Bosonic (cat/GKP): few modes but long cavity T1; logical-first comparison needed.

**When relevant:**
- Procurement / cloud selection: compare back-ends for the **same** circuit.
- Benchmarking a new device: report these in a standard table.
- Setting research milestones: "target 99.9% 2Q at 100 qubits with 1 μs cycle" is well-defined.

**Pitfalls:**
- Confusing cloud-reported average fidelity (RB) with error on a specific circuit (XEB, linear XEB, or full quantum volume).
- Ignoring readout fidelity — SPAM often dominates short NISQ circuits.
- Using coherence alone to predict depth — classical control and calibration drift cut deeper.
- Comparing vendors' own composite metrics (QV vs AQ vs CLOPS) as if they were the same thing.

**Rule of thumb:** The honest figure of merit for NISQ-era devices is `(useful qubits) × (T_coh / gate_time) × (2Q fidelity)` — all three matter together, and "more qubits" without the other two is not a win.
