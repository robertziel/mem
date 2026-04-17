### NISQ-to-Logical Bridging — Design Once, Swap Backend as Hardware Matures

**Pattern:** Write algorithms against a **primitive-based abstraction** (`EstimatorV2`, `SamplerV2`, or framework-equivalents) so the same code runs on today's NISQ device, tomorrow's early fault-tolerant device (eFTQC / logical qubits with modest distance), and the eventual fully fault-tolerant machine. The abstraction hides whether the returned `<H>` came from raw shots + ZNE, logical-qubit sampling with postselection, or magic-state-distilled Toffoli chains. The backend changes — the **interface stays constant**.

**When to use:**
- Library or research code you expect to maintain for >2 years.
- Algorithms that naturally degrade gracefully (VQE, QAOA, QPE with variable precision).
- Benchmarking pipelines that need to compare NISQ and eFTQC results fairly.

**The abstraction stack:**
```
          +-------------------------------------+
Algorithm |  VQE / QPE / QAOA / QSP / ...       |   <-- identical across eras
          +-------------------------------------+
                         |
                         v primitive call
          +-------------------------------------+
Primitive |  Estimator.run([(circuit, obs, ...)]|
          +-------------------------------------+
                         |
                         v backend dispatch
          +-------------+-----------+------------+
NISQ      | eFTQC       | FTQC      | Simulator  |
(ZNE/PEC) | (logical+d=3) | (QEC)  | (Aer, GPU) |
          +-------------+-----------+------------+
```

**Minimal example (same algo, three backends):**
```python
def vqe_step(estimator, ansatz_isa, H, theta):
    pub = (ansatz_isa, H, theta)
    return estimator.run([pub]).result()[0].data.evs[0]

# NISQ path
est_nisq = EstimatorV2(mode=ibm_heron,
    options=EstimatorOptions(resilience_level=2))

# eFTQC path — same interface, logical qubits under the hood
est_logical = EstimatorV2(mode=logical_backend,
    options=EstimatorOptions(resilience_level=1,   # readout only
                             logical_distance=3))

# Simulator path
est_sim = EstimatorV2(mode=AerSimulator())

# Algorithm code unchanged:
energy = vqe_step(est_nisq if device_is_nisq else est_logical,
                  isa, H, params)
```

**Backend-era comparison:**

| Axis | NISQ (today) | eFTQC (~2027–2030) | FTQC (later) |
|------|--------------|---------------------|---------------|
| Qubit count | 100–1000 physical | 50–200 logical | 1000+ logical |
| Logical error rate | 1e-2 to 1e-3 | 1e-4 to 1e-6 | 1e-10+ |
| Mitigation | Heavy (ZNE/PEC) | Light (readout) | None needed |
| Gates | Continuous-angle | Clifford + T (distilled) | Clifford + T |
| Dominant cost | Shot multiplier | T-gate (distillation) | Qubit-seconds |
| Algorithm bias | Noise-dominated | Shot-dominated | Precision-dominated |

**Graceful-degradation checklist:**
- Does the algorithm have a **precision knob** (shots, trotter steps, Krylov dimension)? If yes, the same code runs at low precision on NISQ and high precision on FTQC — this is what "bridging" means.
- Does it rely on **continuous-angle rotations**? FTQC replaces them with Solovay–Kitaev / synthesis; the primitive hides this. Check that your gate set is transpile-targetable both ways.
- Does the observable commute with **postselection-friendly symmetries** (particle number, parity, spin)? Both eras benefit, but eFTQC needs it less — build it in once.

**Trade-offs:**
- **Pro:** One codebase ages with the hardware; library users don't rewrite their scripts each device generation.
- **Pro:** Clean separation between **algorithm correctness** (testable on simulator) and **backend-era tuning** (in the primitive options).
- **Con:** You give up tricks that only work at one era (pulse-level control on NISQ, T-count optimization on FTQC) unless the primitive exposes a lower-level API.
- **Con:** The primitive abstraction is an evolving API; pinning to a stable subset costs you newest features.

**Pitfalls:**
- Hardcoding `resilience_level` in algorithm code — pushes NISQ-era decisions into an era-agnostic layer. Keep resilience in a config object.
- Assuming eFTQC is "just a less noisy NISQ" — logical gate sets are **discrete**; rotation-by-`theta` becomes a synthesis problem. Build your circuits in the `RZ/SX/CX` ISA even on NISQ so eFTQC compilation is trivial later.
- Writing Hamiltonians as huge `PauliSumOp` objects that compile fine on today's cloud but not on a logical-qubit compiler — test compilation against a logical target early.
- Over-abstracting — if your algorithm **is** a pulse-level experiment, bridging doesn't apply; write to the metal.

**Example:** Chemistry VQE written against `EstimatorV2`. In 2025 it runs on `ibm_fez` with resilience 2 and SQD post-processing. In 2029 the same script retargets `ibm_quantum_logical` (hypothetical early-FTQC), drops to resilience 1, and trusts the logical layer for the heavy lifting. Algorithm file diff: zero lines.

**Rule of thumb:** Write algorithms against the primitive contract, keep era-specific tuning (resilience level, distance, T-budget) in configs — the abstraction is only as valuable as your discipline in not breaking it.
