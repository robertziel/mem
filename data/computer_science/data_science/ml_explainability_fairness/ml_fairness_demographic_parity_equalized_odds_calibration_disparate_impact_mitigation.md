### ML Fairness (demographic parity, equalized odds, calibration, disparate impact, mitigation)

**When:** ML systems making consequential decisions about people — credit, hiring, policing, healthcare, advertising. **Models can encode and amplify bias** even without explicit protected attributes. Fairness auditing and mitigation are increasingly **legally required** (EU AI Act, US ECOA, NYC AEDT law).

**Schema:**

| Concept | Detail |
|---|---|
| **Protected attribute** `A` | Race, gender, age, etc. |
| **Outcome** `Y` | True label (binary or continuous) |
| **Prediction** `Ŷ` | Model output |
| **Disparity** | Difference in metric across groups defined by `A` |
| **Fairness criterion** | Formal definition of "fair" — multiple, often **mutually incompatible** |

> **No single fairness definition is universally correct.** Choose the one matching the application's stakes.

#### Fairness criteria (the three families)

| Family | Definition | Use when |
|---|---|---|
| **Independence (Demographic Parity)** | `Ŷ ⊥ A` — same selection rate across groups | "Show ads equally to all groups" |
| **Separation (Equalized Odds)** | `Ŷ ⊥ A | Y` — same TPR and FPR across groups | "Don't make more mistakes on one group" |
| **Sufficiency (Calibration)** | `Y ⊥ A | Ŷ` — predicted prob matches reality across groups | "Predicted risk means same thing across groups" |

> **Impossibility theorem (Chouldechova 2017):** can't satisfy all three simultaneously when base rates differ. Pick by stakes.

#### Common fairness metrics

| Metric | Formula | Tests |
|---|---|---|
| **Demographic parity (statistical parity)** | `P(Ŷ=1 | A=a)` equal across `a` | Selection rate balance |
| **Disparate impact (4/5 rule)** | `min(rate_a) / max(rate_a) ≥ 0.8` | US EEOC standard |
| **TPR / Recall parity** | `P(Ŷ=1 | Y=1, A=a)` equal | Equal opportunity |
| **FPR parity** | `P(Ŷ=1 | Y=0, A=a)` equal | Equal false-alarm rate |
| **Equalized odds** | TPR AND FPR parity | Both above |
| **PPV / Precision parity** | `P(Y=1 | Ŷ=1, A=a)` equal | Predictive parity |
| **Calibration parity** | `P(Y=1 | Ŝ=s, A=a)` equal across `a`, for all score `s` | Fair risk score |
| **Treatment equality** | `FN/FP` ratio equal across groups | — |

#### Code: compute fairness metrics

```python
def fairness_metrics(y_true, y_pred, protected, positive_class=1):
    metrics = {}
    for group in np.unique(protected):
        mask = protected == group
        yt, yp = y_true[mask], y_pred[mask]
        metrics[group] = {
            "selection_rate": yp.mean(),                            # demographic parity
            "tpr": ((yt == positive_class) & (yp == positive_class)).sum() / max((yt == positive_class).sum(), 1),
            "fpr": ((yt != positive_class) & (yp == positive_class)).sum() / max((yt != positive_class).sum(), 1),
            "ppv": ((yt == positive_class) & (yp == positive_class)).sum() / max((yp == positive_class).sum(), 1),
        }
    return metrics
```

#### Tools

| Tool | Strength |
|---|---|
| **Fairlearn** (Microsoft) | Comprehensive: metrics + mitigation algorithms |
| **AIF360** (IBM) | Many fairness metrics; older |
| **What-If Tool** (Google) | Interactive analysis |
| **Aequitas** | Bias audit toolkit |
| **TensorFlow Model Analysis** | Per-slice metrics |
| **Themis-ML** | Causal fairness |
| **shap + per-group analysis** | Custom auditing |

```python
from fairlearn.metrics import (
    selection_rate, demographic_parity_difference,
    equalized_odds_difference, true_positive_rate
)
from fairlearn.metrics import MetricFrame

mf = MetricFrame(
    metrics={"selection_rate": selection_rate, "tpr": true_positive_rate},
    y_true=y_true, y_pred=y_pred,
    sensitive_features=protected,
)
print(mf.by_group)        # per-group metrics
print(mf.difference())     # max - min
```

#### Sources of bias

| Source | Detail |
|---|---|
| **Historical bias** | Past decisions reflect societal bias (hiring, lending) |
| **Representation bias** | Under-represented groups in training data |
| **Measurement bias** | Different feature meaning per group (e.g., arrests ≠ crimes) |
| **Aggregation bias** | One-size-fits-all model fits dominant group |
| **Evaluation bias** | Test data not representative |
| **Deployment bias** | Use case differs from training context |
| **Algorithmic bias** | Loss / regularization disadvantages minority |
| **Feedback loops** | Past biased decisions become training labels |
| **Proxy variables** | ZIP code, name → race; not "neutral" |

> **Removing the protected attribute is rarely sufficient** — proxies persist.

#### Mitigation strategies

| Stage | Approach |
|---|---|
| **Pre-processing** | Reweighting, resampling, fair representation learning |
| **In-processing** | Fairness constraints / penalties during training |
| **Post-processing** | Adjust thresholds per group |

##### Pre-processing

| Method | Detail |
|---|---|
| **Reweighting** | Up/downweight per (group, label) cell |
| **Sampling** | Oversample under-represented groups |
| **Disparate impact remover** | Modify features to break correlation with `A` |
| **Fair representation learning** | Learn embedding `Z` such that `Z ⊥ A` |
| **Suppression** | Remove `A` and proxies (often insufficient) |

##### In-processing

| Method | Detail |
|---|---|
| **Adversarial debiasing** | Train model `f`; train adversary to predict `A` from `f`'s output; minimize adversary's success |
| **Constrained optimization** | Add fairness constraint to loss (Reductions; Fairlearn) |
| **Prejudice remover** | Penalty term on disparity |
| **Cost-sensitive learning** | Per-group misclassification costs |

```python
# Fairlearn — Exponentiated Gradient with demographic parity constraint
from fairlearn.reductions import ExponentiatedGradient, DemographicParity

mitigator = ExponentiatedGradient(
    estimator=lr, constraints=DemographicParity(), max_iter=20
)
mitigator.fit(X, y, sensitive_features=protected)
y_pred = mitigator.predict(X_test)
```

##### Post-processing

| Method | Detail |
|---|---|
| **Threshold optimization** | Different threshold per group to satisfy criterion |
| **Equalized odds post-processing** (Hardt et al.) | Probabilistic flipping to equalize TPR / FPR |
| **Reject option** | Send borderline cases for human review |

```python
from fairlearn.postprocessing import ThresholdOptimizer

post = ThresholdOptimizer(estimator=base_model, constraints="equalized_odds")
post.fit(X, y, sensitive_features=protected)
y_pred = post.predict(X_test, sensitive_features=protected_test)
```

#### Choosing fairness criterion

| Application | Suggested criterion |
|---|---|
| Lending / credit | Equalized odds; calibration parity |
| Hiring | Demographic parity (4/5 rule); equalized odds |
| Healthcare diagnosis | Calibration parity (probabilities mean same thing) |
| Recidivism prediction | Hot debate — calibration vs equalized odds |
| Ad targeting | Demographic parity (don't exclude groups) |
| Content moderation | Equalized FPR (don't over-flag minority speech) |
| Search / ranking | Exposure parity |

#### The COMPAS controversy (illustrative)

ProPublica analysis: COMPAS recidivism tool had **equal calibration** across race but **unequal FPR** (Black defendants more often falsely classified high-risk). The Northpointe / ProPublica dispute showed that **different fairness criteria reach opposite conclusions** about the same model. **Choose criteria carefully and explicitly**.

#### Trade-offs

| Trade-off | Detail |
|---|---|
| **Accuracy vs fairness** | Often a real tradeoff but smaller than expected for many problems |
| **Different fairness criteria** | Mutually incompatible (impossibility theorems) |
| **Group vs individual fairness** | Group: avg per group; Individual: similar people get similar predictions |
| **Mitigation cost** | Training time / engineering complexity |

#### Group vs individual fairness

| Concept | Detail |
|---|---|
| **Group fairness** | Statistical equality at group level (most metrics above) |
| **Individual fairness** | "Similar individuals → similar predictions" (Dwork et al.) |
| **Counterfactual fairness** | Same prediction in counterfactual world where `A` changed |

#### Disparate impact (the legal standard)

US EEOC's **80% rule**: selection rate of disadvantaged group ≥ 80% of advantaged group's rate.

```python
def disparate_impact(y_pred, protected, advantaged):
    rate_adv = y_pred[protected == advantaged].mean()
    rates = {}
    for g in np.unique(protected):
        rate_g = y_pred[protected == g].mean()
        rates[g] = rate_g / rate_adv
    return rates       # if any < 0.8, "disparate impact"
```

> Used in employment law audits. Simple but limited (single-attribute, binary).

#### Per-segment performance

Beyond explicit fairness, **always compute per-segment metrics**:

```python
for segment_col in ["gender", "race", "age_bucket", "country"]:
    print(f"\n{segment_col}:")
    for value, group in df.groupby(segment_col):
        print(f"  {value}: AUC = {roc_auc_score(group['y'], group['pred']):.3f},"
              f" precision = {precision_score(group['y'], group['pred']):.3f}")
```

> **Aggregate metrics hide segment regressions.** A model that's 90% AUC overall can be 60% AUC for one group.

#### Fairness in regression

| Definition | Detail |
|---|---|
| **Calibration parity** | `E[Y - Ŷ | Ŷ, A=a]` equal across groups |
| **Group conditional accuracy** | `E[(Y - Ŷ)² | A=a]` equal |
| **Quantile parity** | Median / quantiles of `Ŷ` equal |

#### Fairness in ranking

| Definition | Detail |
|---|---|
| **Exposure parity** | Each group gets fair share of top-K |
| **Demographic parity at rank K** | Same proportion as in population |
| **DCG / NDCG parity** | Same accuracy per group |
| **Counterfactual ranking** | Same ranking under group flip |

#### Fairness in NLP

| Source of bias | Mitigation |
|---|---|
| **Toxicity classifier flagging dialect** | Test with diverse dialects; reweight |
| **Word embeddings encoding bias** ("man : computer programmer = woman : ???") | De-bias via projection / retrain |
| **Translation gender stereotypes** | Counterfactual augmentation |
| **LLM generation bias** | RLHF; safety fine-tuning |

#### Auditing checklist

| Step | Action |
|---|---|
| 1 | Identify protected attributes + proxies |
| 2 | Compute per-group performance |
| 3 | Compute fairness metrics (parity, equalized odds, calibration) |
| 4 | Determine if disparities are statistically significant |
| 5 | Compare to baseline (random, current system) |
| 6 | If disparate, apply mitigation |
| 7 | Re-evaluate after mitigation |
| 8 | Document in model card |
| 9 | Set up monitoring |
| 10 | Periodic re-audit |

#### Production monitoring

| Metric | Why |
|---|---|
| Per-group selection rate | Drift in fairness over time |
| Per-group performance | Subgroup degradation |
| New protected attribute distributions | Population shift |
| Mitigation effectiveness | Verify it still works |
| User complaints by group | External signal |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Removing `A` and assuming fair | Proxies still encode it |
| One fairness metric only | Audit multiple; pick by use case |
| Demographic parity always | Sometimes wrong (medical screening with real differences) |
| Ignoring intersectionality | (Black women) ≠ (women) ∩ (Black) — audit intersections |
| Fairness mitigation that destroys utility | Pareto front; pick threshold |
| Fairness "solved" once | Periodic re-audit; production drift |
| No documentation | Model cards required for compliance |
| Treating it as legal-only | Engineering / DS responsibility too |
| Optimizing only top-line accuracy | Per-segment regressions hidden |
| One protected group | Audit all (race, gender, age, religion, disability, …) |

#### Tools

| Tool | Strength |
|---|---|
| **Fairlearn** | Mitigation + metrics |
| **AIF360** | Many algorithms |
| **Aequitas** | Bias audit toolkit |
| **What-If Tool** | Interactive |
| **Themis** | Causal fairness |
| **fairness-indicators** (TF) | Slicing dashboards |

#### Documentation: Model Card example

| Section | Content |
|---|---|
| Intended use | Where deployed; populations served |
| Performance | Overall + per-group |
| Fairness audit | Which metrics; results; thresholds |
| Limitations | Known biases; under-represented groups |
| Mitigation applied | What and why |
| Monitoring plan | What's tracked in production |
| Re-audit schedule | Quarterly / per-model-version |

#### Decision

```
Application stakes?
├─ Low (ad targeting)                   → Demographic parity / 80% rule
├─ Medium (recommendations)             → Equalized odds / per-group AUC
├─ High (lending, hiring)              → Equalized odds + calibration + manual review
├─ Very high (criminal justice, health) → All three; counterfactuals; human-in-the-loop
└─ Specific regulation (EU AI Act, ECOA) → Mandatory documentation + audit
```

**Rule of thumb:** **fairness has multiple incompatible definitions** — pick by stakes. **Always compute per-group performance** in addition to aggregate metrics. **Removing the protected attribute is rarely enough** — proxies persist. Use **Fairlearn / AIF360** for tooling. **Mitigation strategies** (pre / in / post-processing) trade utility for fairness — show the **Pareto front** to stakeholders. **Document everything in a model card** — required for compliance. Audit periodically.
