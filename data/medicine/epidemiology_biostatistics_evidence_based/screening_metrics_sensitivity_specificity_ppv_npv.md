### Screening Metrics — Sensitivity, Specificity, PPV, NPV

**The 2×2:**

|              | **Disease +** | **Disease −** |
|--------------|---------------|---------------|
| **Test +**   | TP            | FP            |
| **Test −**   | FN            | TN            |

**Definitions:**

| Term | Formula | Plain English |
|------|---------|---------------|
| **Sensitivity (Sn)** | TP / (TP+FN) | % of diseased correctly identified |
| **Specificity (Sp)** | TN / (TN+FP) | % of healthy correctly cleared |
| **PPV** | TP / (TP+FP) | If test+, probability of disease |
| **NPV** | TN / (TN+FN) | If test−, probability healthy |
| **Prevalence** | (TP+FN) / total | Pre-test probability |
| **Accuracy** | (TP+TN) / total | Overall % correct |

**Critical relationships:**

| Property | Depends on |
|----------|-----------|
| Sn, Sp | **Intrinsic to the test** (don't depend on prevalence) |
| **PPV, NPV** | **Depend on prevalence** (and Sn, Sp) |

| Prevalence ↑ | PPV ↑, NPV ↓ |
| Prevalence ↓ | PPV ↓, NPV ↑ |

**Practical implications:**

| Setting | Implication |
|---------|-------------|
| **Screening (low prevalence)** | High **specificity** essential to avoid many false positives; high Sn ensures few missed cases |
| Diagnostic confirmation | High specificity → confirmation; high sensitivity → ruling out |
| Rare disease | Many positives are false → confirm with second test |

**SnNOUT, SpPIN:**

| Mnemonic | Meaning |
|----------|---------|
| **SnNOUT** | A test with high **Sn**sitivity, when negative, rules **OUT** disease |
| **SpPIN** | A test with high **Sp**ecificity, when positive, rules **IN** disease |

**Likelihood ratios (better for serial reasoning):**

| LR | Formula | Effect on post-test prob |
|----|---------|--------------------------|
| **LR+** | Sn / (1 − Sp) | **>10** strong rule-in; 5-10 moderate |
| **LR−** | (1 − Sn) / Sp | **<0.1** strong rule-out; 0.1-0.2 moderate |

**Bayesian updating:**

| Pre-test odds × LR = Post-test odds |
|-------------------------------------|
| Convert prevalence (probability) → odds |
| Multiply by LR |
| Convert odds back to probability |

**ROC curve and AUC:**

| AUC | Discrimination |
|-----|---------------|
| 0.5 | Useless |
| 0.7-0.8 | Acceptable |
| 0.8-0.9 | Excellent |
| >0.9 | Outstanding |

ROC plots **Sn vs (1 − Sp)** at various cutoffs; threshold choice trades Sn vs Sp.

**Test cutoff trade-offs:**

| Move cutoff | Effect |
|-------------|--------|
| Lower threshold (more "positives") | ↑ Sn, ↓ Sp |
| Higher threshold (fewer "positives") | ↓ Sn, ↑ Sp |

**Common screening tests with metrics (illustrative):**

| Test | Disease | Notes |
|------|---------|-------|
| Mammography | Breast cancer | ~80% Sn; recall + biopsy increase with younger / dense breasts |
| Colonoscopy | Colon cancer | High Sn for adenomas / cancer; gold standard |
| Pap smear | Cervical cancer | Combined with HPV co-testing |
| PSA | Prostate cancer | Controversial — overdiagnosis |
| HbA1c | Diabetes | ≥6.5% diagnostic |
| 4th-gen HIV Ag/Ab | HIV | Window 2-4 wk; Western blot replaced by HIV-1/2 differentiation |
| LDCT | Lung cancer in heavy smokers | NLST; reduces lung cancer mortality |

**Lead-time vs length-time bias (screening pitfalls):**

| Bias | Description |
|------|-------------|
| **Lead-time** | Earlier detection → apparent ↑ survival without true mortality benefit |
| **Length-time** | Slow-growing (less aggressive) cancers more likely to be caught in screening interval |
| **Overdiagnosis** | Detection of disease that would never become clinically significant |

**Disease-specific mortality** (RCT outcome) is the gold standard for screening trials — not 5-year survival.

**Reliability vs validity:**

| Term | Meaning |
|------|---------|
| **Reliability** | Reproducibility (intra- / inter-rater, test-retest) |
| **Validity** | Measures what it claims to measure |
| Internal consistency | Cronbach's α (multi-item scales) |
| Inter-rater | Cohen's kappa |

**Predictive value worked example:**

Population: 10,000 with 1% prevalence (100 diseased).
Test Sn 95%, Sp 90%.

| | Disease + | Disease − | Total |
|---|-----------|-----------|-------|
| Test + | 95 | 990 | 1085 |
| Test − | 5 | 8910 | 8915 |

**PPV = 95 / 1085 ≈ 8.8%**. So ~91% of positives are FALSE despite "good" test characteristics — because prevalence is low.

This is why **screening tests need confirmation** before life-altering decisions.

**Common gotchas:**
- **Sn / Sp don't change** with prevalence; **PPV / NPV do**
- **High Sn alone insufficient** for screening if Sp is poor (too many false positives)
- **Lead-time bias** can make ineffective screening look beneficial — RCT with mortality endpoint is the only way to confirm
- **Pre-test probability matters** — in a low-prevalence setting, even a "very positive" test may be wrong; in a high-prevalence setting, a "negative" may not rule out
- **5-year survival ≠ mortality benefit** in screening — disease-specific mortality is the right measure
- **LR is the practical clinical tool** — multiplies pre-test odds to give post-test odds

**Rule of thumb:** Sn/Sp are intrinsic to the test; PPV/NPV depend on prevalence. SnNOUT, SpPIN. LR+ >10 rules in; LR− <0.1 rules out. Always think pre-test probability before ordering the test.
