### IBM Qiskit Runtime — Primitive Resilience Levels

**What it is:** `resilience_level` is an `EstimatorV2` option that turns on progressively stronger error-mitigation techniques. It trades QPU shots (sometimes a lot of them) for lower bias in expectation values. It is **independent** of `optimization_level` (which is about transpile-time depth reduction); you can mix any combination.

**The four levels (EstimatorV2):**

| Level | Technique | Shot multiplier | Bias reduction | Cost note |
|---|---|---|---|---|
| 0 | None — raw sampling | 1× | baseline | No mitigation |
| 1 | Measurement error mitigation (TREX / M3) | ~1.2× | Removes readout bias | Always cheap; safe default |
| 2 | ZNE (Zero-Noise Extrapolation) | 3–5× | Removes part of gate-noise bias | Linear / exponential extrapolation from noise-scaled circuits |
| 3 | PEC (Probabilistic Error Cancellation) | 10–100×+ | Unbiased estimator (in theory) | Requires device learning; very expensive |

Sampler V2 only supports levels 0–1 (no ZNE/PEC for sampling distributions).

**API shape:**
```python
from qiskit_ibm_runtime import EstimatorV2, EstimatorOptions

options = EstimatorOptions(
    default_shots=4096,
    resilience_level=2,
)
# Fine-grained knobs override the level preset
options.resilience.zne.noise_factors = (1, 3, 5)
options.resilience.zne.extrapolator = "exponential"
options.resilience.measure_mitigation = True
options.dynamical_decoupling.enable = True
options.dynamical_decoupling.sequence_type = "XY4"

est = EstimatorV2(mode=backend, options=options)
result = est.run([(isa, H)]).result()
```

**What each technique actually does:**

- **Measurement mitigation (level 1)** — learns the per-qubit (or correlated) readout confusion matrix offline, then inverts it on returned counts. Cheap (~1 calibration circuit per qubit), always-on recommended.
- **ZNE (level 2)** — runs the same logical circuit at 3+ artificially amplified noise levels (gate folding `G → G G† G` or pulse stretching), fits E(λ) vs λ, extrapolates to λ = 0. Works best when noise is close to depolarizing and depth is moderate.
- **PEC (level 3)** — learns a sparse Pauli-Lindblad noise model per layer, samples quasi-probability corrections (many circuits with signed weights). Unbiased in the ideal limit but the signed-sum variance blows up exponentially with circuit depth.

**Dynamical decoupling (DD):**
DD is a separate knob (not a resilience level) that inserts pulse sequences (X, XY4, XY8, CPMG) on idle qubits during 2Q gates elsewhere. Cheapest possible mitigation:
```python
options.dynamical_decoupling.enable = True
options.dynamical_decoupling.sequence_type = "XY4"   # 'X', 'XpXm', 'XY4', 'XY8'
```
Almost always a free win — turn it on even at resilience 0.

**Two independent knobs:**

| Knob | Controls | Affects |
|---|---|---|
| `optimization_level` | Transpile passes | Compile time, gate count, depth |
| `resilience_level` | Post-processing + noise learning | QPU shots, result bias |

You can do `optimization_level=3, resilience_level=1` (heavy compile, light mitigation) or the reverse. They are orthogonal.

**Choosing a level — depth-based heuristic:**

| Circuit 2Q depth | Recommended resilience |
|---|---|
| <10 | 1 (+DD) |
| 10–50 | 1–2 |
| 50–200 | 2 with exponential ZNE |
| >200 | 3 (PEC) — if you can afford it |

**Pitfalls:**
- Jumping to level 3 on a shallow circuit — you pay 10–100× shots to correct bias that's already tiny at level 1.
- Using ZNE on a circuit whose noise is highly non-depolarizing (e.g., strong coherent miscalibration) — extrapolation fits garbage.
- PEC without a freshly-learned noise model (stale `learn_data`) → estimator goes unbiased only in the limit of perfect learning.
- Forgetting that `resilience_level` changes the **number of submitted pubs/circuits** internally — your job-time estimate is off by the shot multiplier.

**Rule of thumb:** Start at `resilience_level=1` with DD on; graduate to level 2 (ZNE) only for circuits with 2Q depth >50; reserve level 3 (PEC) for hero-number chemistry demos where shots are not the bottleneck.
