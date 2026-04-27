### Graduated Resilience — Start Raw, Escalate Only if Needed

**Pattern:** Treat error mitigation as a **cost–accuracy ladder**, not an always-on feature. Start at `resilience_level=0` (raw sampling) to see the true circuit behavior, then climb the ladder — level 1 (readout), level 2 (ZNE), level 3 (PEC) — **only when the result at the current level is inadequate**. Each step up multiplies shot cost; skipping levels you don't need is the single largest controllable cost lever in Qiskit Runtime.

**The ladder (EstimatorV2):**

| Level | Technique | Shot mult. | Bias reduction | Bias still present |
|-------|-----------|-----------|----------------|---------------------|
| 0 | None | 1x | 0 | Everything |
| 1 | TREX / M3 readout mitigation | ~1.2x | Readout confusion | Gate noise |
| 2 | ZNE (linear/exponential) | 3–5x | Gate noise (depolarizing-ish) | Coherent / non-Markovian |
| 3 | PEC | 10–100x+ | All local noise (in theory) | Stale noise models, leakage |

**Decision pattern (pseudocode):**
```python
from qiskit_ibm_runtime import EstimatorV2, EstimatorOptions

def graduated_estimate(isa, H, target_sigma, backend):
    for level in (0, 1, 2, 3):
        opts = EstimatorOptions(
            resilience_level=level,
            default_shots=4096 * (5 ** level),  # budget grows with level
        )
        opts.dynamical_decoupling.enable = True  # always on, free win
        est = EstimatorV2(mode=backend, options=opts)
        res = est.run([(isa, H)]).result()[0]
        if res.stds[0] <= target_sigma:
            return res, level                 # accept
    raise RuntimeError("target sigma not reachable within level 3")
```

**Cost–accuracy at a glance:**

| Circuit 2q depth | Level 0 bias | Level 1 | Level 2 (ZNE) | Level 3 (PEC) |
|-------------------|--------------|---------|----------------|----------------|
| <10 | 1–3% | <1% | <0.5% | <0.3% |
| 10–50 | 5–20% | 3–10% | 1–5% | 0.5–2% |
| 50–200 | 20–60% | 15–40% | 5–15% | 2–8% |
| >200 | unusable | unusable | 10–30% | 5–20% |

**When to use:**
- **Level 0 + DD:** Quick sanity checks, compile-time correctness tests, Clifford-only benchmarking.
- **Level 1:** Default for anything production-ish — readout mitigation is nearly free.
- **Level 2 (ZNE):** Circuits with 2q depth 50–200, noise close to depolarizing. Start with `noise_factors=(1,3,5)` and `exponential` extrapolator.
- **Level 3 (PEC):** Hero-number demos, chemistry publications, and only after running fresh device `learn_data` within the last ~24h.

**Trade-offs:**
- Orthogonal to `optimization_level` — that controls **compile-time depth**, this controls **run-time bias**. Tune independently.
- Skipping the ladder (jumping straight to 3) often **wastes shots** on bias that was already small at level 1.
- Going **too low** when circuits are deep wastes shots in the opposite direction — the mean is biased and you spend shots tightening `sigma` around the wrong value.

**Pitfalls:**
- Assuming level 3 is "always more accurate." PEC is unbiased only with a fresh, correct Pauli–Lindblad model; a stale model biases in a direction you cannot audit.
- Forgetting that level 2/3 **change the number of submitted circuits** under the hood — job-time estimates are off by the shot multiplier.
- Using ZNE with noise factors (1,1.5) — the dynamic range is too small; the fit is dominated by statistical noise.
- Leaving DD off at level 0 — free bias reduction, no reason to skip it.

**Sampler V2 caveat:** Levels 0–1 only. ZNE/PEC don't apply to distributions (they're expectation-value constructs). For sampling with mitigation, consider postselection on symmetry or the "readout twirling + M3" combo instead.

**Comparison — graduated vs one-shot strategy:**

| Axis | Graduated (this pattern) | Always level 3 | Always level 0 |
|------|---------------------------|-----------------|-----------------|
| Shots used | Minimum that hits target | ~30x baseline | baseline |
| Wall-clock | Variable | High | Low |
| Bias | Target-bounded | Very low (if model fresh) | Large for deep |
| Dev-loop friendliness | High | Low | High but wrong |

**Example:** A 40-layer 50q ansatz — level 1 gives sigma 2% but 8% bias; level 2 with exponential ZNE brings bias to ~2% for 4x shots; level 3 overshoots the target at 20x shots. Graduated approach stops at level 2.

**Rule of thumb:** Always run level 0 once (with DD) to see the raw signal; default all subsequent runs to level 1; only climb to level 2 or 3 when `sigma` is fine but you can prove the **mean** is biased against a trusted reference.
