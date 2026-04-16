### Scaling Laws — Kaplan (2020) and Chinchilla (2022)

**Papers:**
- **Kaplan et al. (2020)** — "Scaling Laws for Neural Language Models" (OpenAI). Showed loss follows smooth power laws in model size N, dataset size D, and compute C.
- **Hoffmann et al. (2022)** — "Training Compute-Optimal Large Language Models" (DeepMind, "Chinchilla"). Corrected Kaplan's prescription: for a given compute budget, the optimal trade-off uses MORE data and SMALLER models than previously thought.

**The core finding (Kaplan):**
```
Test loss L follows a power law:

  L(N) ≈ (N_c / N)^α_N     — loss decreases with model size N
  L(D) ≈ (D_c / D)^α_D     — loss decreases with dataset size D
  L(C) ≈ (C_c / C)^α_C     — loss decreases with compute C

Where:
  N = number of non-embedding parameters
  D = number of training tokens
  C = total training compute (FLOPs)
  α_N, α_D, α_C ≈ 0.07-0.10 (model-dependent)

Implications:
  - Loss is predictable from size/data/compute
  - No plateau observed — scaling keeps working (within studied range)
  - You can project training runs before running them
```

**Kaplan's (flawed) prescription:**
```
Given a compute budget C, allocate:
  70% to model size (bigger is better)
  30% to data (keep it small, train fewer steps)

This drove GPT-3 (175B params, trained on 300B tokens — undertrained)
and many 2020-2021 models that were HUGE but data-starved.
```

**Chinchilla's correction (2022):**
```
DeepMind re-ran scaling experiments more carefully and found:

  Model size N and dataset size D should scale EQUALLY.

Optimal ratio: ~20 tokens per parameter.

Examples:
  1B param model  → train on ~20B tokens
  10B param model → train on ~200B tokens
  70B param model → train on ~1.4T tokens

Chinchilla model: 70B params, 1.4T tokens
  → outperformed GPT-3 (175B, 300B tokens) despite being 2.5× SMALLER
  → same training compute, much better results
```

**Why Kaplan was wrong:** Didn't tune learning rate schedules for smaller models well, so underestimated their potential when trained longer.

**Post-Chinchilla implications:**

```
2020-2021: "Go big" era
  GPT-3 (175B), PaLM (540B), Gopher (280B)
  All undertrained by Chinchilla standards

2022-present: Data-hungry era
  LLaMA-65B trained on 1.4T tokens (Chinchilla-optimal)
  LLaMA 2-70B on 2T tokens (past-optimal, overtraining for inference efficiency)
  LLaMA 3-70B on 15T tokens (way past-optimal)

Inference-aware scaling (beyond Chinchilla):
  If you'll serve the model a lot, overtrain a smaller one
  Smaller model = cheaper inference = worth more training cost
  Modern SOTA: 7-70B parameter models trained on 10-15T tokens
```

**The scaling laws bonus: emergence:**
```
Some capabilities appear suddenly at scale (not gradually):
  - Few-shot learning (GPT-3 at ~10B params)
  - Chain-of-thought reasoning (~60B+ params)
  - Tool use, code generation (varies)

"Emergent" abilities: loss continues smooth, but downstream metrics
show phase transitions.

Debate ongoing: are these real emergent, or artifacts of sharp metrics
(accuracy thresholds) vs smooth underlying capability?
```

**Quick reference table — compute-optimal sizes (Chinchilla):**

| Compute (FLOPs) | Optimal N | Optimal D |
|---|---|---|
| 10^18 | ~100M | ~2B tokens |
| 10^19 | ~350M | ~7B tokens |
| 10^20 | ~1B | ~20B tokens |
| 10^21 | ~3B | ~60B tokens |
| 10^22 | ~10B | ~200B tokens |
| 10^23 | ~30B | ~600B tokens |
| 10^24 | ~70B | ~1.4T tokens |

Compute formula: `C ≈ 6 × N × D` (forward + backward pass)

**Rule of thumb:** Model loss scales as a power law in parameters, data, and compute — predictable, no plateau in sight. Kaplan (2020) said prioritize model size; Chinchilla (2022) corrected: scale parameters and tokens equally (~20 tokens/param). Modern models intentionally overtrain smaller models (LLaMA 3: 70B on 15T tokens) because cheaper inference is worth extra training cost. These laws are why GPT-3 was 175B and why GPT-4 is (rumored) a mixture of smaller experts — the economics of scaling changed after Chinchilla.
