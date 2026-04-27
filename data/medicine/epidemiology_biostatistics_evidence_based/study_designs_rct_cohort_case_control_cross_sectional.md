### Study Designs

**Hierarchy of evidence (strongest → weakest, simplified):**

| Level | Design |
|-------|--------|
| 1 | Systematic review / meta-analysis of RCTs |
| 2 | Single high-quality RCT |
| 3 | Cohort (prospective > retrospective) |
| 4 | Case-control |
| 5 | Cross-sectional |
| 6 | Case series / case reports |
| 7 | Expert opinion / mechanistic |

**Compare key designs:**

| Design | Direction | Measures | Strengths | Weaknesses |
|--------|-----------|----------|-----------|------------|
| **RCT** | Forward (intervention → outcome) | RR, ARR, NNT | **Causation**, controls confounding | Cost, time, generalizability, ethics |
| **Cohort (prospective)** | Forward (exposure → outcome) | RR, incidence | Multiple outcomes, temporality | Slow, large N, loss to follow-up |
| **Cohort (retrospective)** | Backward then forward (records) | RR | Faster, cheaper | Data quality, recall |
| **Case-control** | Backward (outcome → exposure) | **OR** | Rare diseases, fast, cheap | Recall bias, no incidence, single outcome |
| **Cross-sectional** | Snapshot in time | **Prevalence**, OR | Quick, cheap, hypothesis-generating | No causation/temporality |
| **Ecological** | Population-level | Correlation | Hypothesis-generating | **Ecological fallacy** |
| **Case series / report** | Descriptive | None | Hypothesis-generating, rare events | No comparison group |

**Measures of association:**

| Measure | Formula / use | Interpretation |
|---------|---------------|----------------|
| **Risk ratio (RR) / Relative risk** | (a/(a+b)) / (c/(c+d)) — cohort/RCT | RR=1 no effect, >1 ↑ risk, <1 protective |
| **Odds ratio (OR)** | (a×d) / (b×c) — case-control | Approximates RR if outcome rare (<10%) |
| **Hazard ratio (HR)** | Survival analysis | Time-to-event analog |
| **Absolute risk reduction (ARR)** | Risk(control) − Risk(intervention) | Real-world impact |
| **Relative risk reduction (RRR)** | ARR / Risk(control) | Often inflated; misleading |
| **Number needed to treat (NNT)** | 1 / ARR | "How many patients to treat to prevent 1 event" |
| **Number needed to harm (NNH)** | 1 / AR(harm) | Harm equivalent |

**2×2 table layout:**

|  | Disease + | Disease − |
|---|----------|-----------|
| Exposed + | a | b |
| Exposed − | c | d |

**Test characteristics:**

| Term | Formula | Meaning |
|------|---------|---------|
| **Sensitivity** | TP / (TP+FN) | Of those with disease, how many test+ |
| **Specificity** | TN / (TN+FP) | Of those without disease, how many test− |
| **PPV** | TP / (TP+FP) | Of test+, how many truly diseased |
| **NPV** | TN / (TN+FN) | Of test−, how many truly disease-free |
| **Prevalence** | (TP+FN) / total | — |

**SnNOUT, SpPIN:**

| Mnemonic | Meaning |
|----------|---------|
| **SnNOUT** | High **Sn**sitivity → negative test rules **OUT** |
| **SpPIN** | High **Sp**ecificity → positive test rules **IN** |

**Likelihood ratios:**

| LR | Effect on probability |
|----|----------------------|
| **LR+** = Sn / (1 − Sp) | High → ↑ post-test probability |
| **LR−** = (1 − Sn) / Sp | Low → ↓ post-test probability |
| LR+ ≥10 | Strong rule-in |
| LR− ≤0.1 | Strong rule-out |

**ROC curve / AUC:**

| AUC | Discrimination |
|-----|---------------|
| 0.5 | Useless (chance) |
| 0.7-0.8 | Acceptable |
| 0.8-0.9 | Excellent |
| >0.9 | Outstanding |

**Bias types:**

| Bias | Description |
|------|-------------|
| **Selection** | Non-random selection (Berkson hospital admission, healthy worker, volunteer) |
| **Information** | Recall (case-control), interviewer, observer |
| **Lead-time** | Detection earlier appears to ↑ survival without true benefit (cancer screening) |
| **Length-time** | Slower-growing tumors more likely caught in screening (over-represented) |
| **Confounding** | Third variable associated with exposure and outcome |
| **Effect modification** | Different effect across strata (NOT a bias — interaction) |
| **Hawthorne** | Observed → behavior changes |
| **Pygmalion** | Researcher expectations alter results |
| **Surveillance** | More testing → more diagnoses |
| **Publication** | Positive results published more |
| **Attrition** | Loss to follow-up |
| **Measurement** | Inaccurate measurements |

**Reducing bias:**

| Bias | Fix |
|------|-----|
| Selection | Randomization |
| Recall | Use medical records, prospective design |
| Observer | Blinding |
| Confounding | Randomization, stratification, matching, regression, propensity scores |
| Lead/length-time in screening | RCT with **disease-specific mortality** as outcome |

**Trial concepts:**

| Term | Meaning |
|------|---------|
| Single-blind | Subject doesn't know |
| Double-blind | Subject + investigator |
| Triple-blind | + analyst |
| Crossover | Patients receive both interventions in sequence |
| Cluster RCT | Group-level randomization |
| **Intention-to-treat (ITT)** | Analyze as randomized, regardless of adherence — preserves randomization, real-world |
| **Per-protocol** | Only those who completed — efficacy in ideal compliance |
| **Equivalence / non-inferiority** | New treatment as good as / not worse than standard within margin |
| **Adaptive design** | Modifies based on accumulating data |

**Statistical concepts:**

| Term | Meaning |
|------|---------|
| **Type I error (α)** | False positive — rejecting null when true (typical α = 0.05) |
| **Type II error (β)** | False negative — failing to reject null when alternative true |
| **Power (1−β)** | Detect effect if it exists; usually 80% |
| **p-value** | P(data this extreme \| null true); **NOT P(null true)** |
| **Confidence interval** | Range covering true value with stated probability across many replications |
| **Effect size** | Magnitude of difference (Cohen's d, r, RR) |

**Common gotchas:**
- **Case-control** → **OR** (can't compute incidence); **cohort/RCT** → **RR/HR**
- **Confounding requires** the variable to be associated with **both** exposure and outcome
- **Lead-time bias** in cancer screening — apparent survival ↑ without mortality benefit
- **Specificity** matters when prevalence is low (most positives become FP); high Sn matters when missing the dx is dangerous
- **Likelihood ratios beat sensitivity/specificity** for clinical decision-making
- **Subgroup analyses** are hypothesis-generating, not confirmatory
- **Statistical vs clinical significance** — large studies may show statistically significant tiny effects
- **NNT** is more clinically meaningful than RRR

**Rule of thumb:** Match design to question (RCT for treatment, cohort for exposure-outcome, case-control for rare disease, cross-sectional for prevalence). Watch for bias and confounding. Use absolute risk + NNT for clinical impact. Likelihood ratios update probability.
