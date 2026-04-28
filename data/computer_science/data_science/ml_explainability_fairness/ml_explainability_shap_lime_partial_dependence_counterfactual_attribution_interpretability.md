### ML Explainability (SHAP, LIME, partial dependence, counterfactual, attribution, interpretability)

**When:** **understand model predictions** — debug failures, satisfy regulators, build trust, audit fairness, communicate to stakeholders. Black-box models without interpretation are increasingly **unacceptable** in regulated industries.

**Schema (the two layers):**

| Layer | Question |
|---|---|
| **Global** | "What does the model do overall? Which features matter most?" |
| **Local** | "Why did the model predict this for this specific instance?" |

#### Method catalog

| Method | Layer | Type | Best for |
|---|---|---|---|
| **Feature importance** (built-in) | Global | Tree-specific | Quick overview |
| **Permutation importance** | Global | Model-agnostic | Reliable global |
| **SHAP** | Both | Game-theoretic | Modern default |
| **LIME** | Local | Local surrogate | Image / text |
| **Partial dependence (PDP)** | Global | Marginal effect | Single-feature shape |
| **ICE plot** | Local | Per-instance PDP | Heterogeneity |
| **Accumulated Local Effects (ALE)** | Global | Less biased PDP | Correlated features |
| **Counterfactual explanations** | Local | "What would change the prediction?" | Recourse |
| **Anchors** | Local | "If these conditions hold, prediction stays the same" | Discrete features |
| **Integrated gradients** | Local | Deep learning | NN attribution |
| **Layer-wise relevance propagation** | Local | Deep learning | Image / text |
| **Attention weights** | Local | Transformers | Interpretation (limited) |
| **Concept activation vectors (TCAV)** | Global | Deep | High-level concepts |

#### SHAP (the modern default)

**Shapley values** from cooperative game theory: fair attribution of "credit" to each feature for a prediction.

**Properties:**

| Property | Detail |
|---|---|
| **Local accuracy** | Sum of SHAP values = prediction − baseline |
| **Missingness** | Missing features contribute 0 |
| **Consistency** | If feature contributes more in model A than B, SHAP(A) ≥ SHAP(B) |

```python
import shap
import xgboost as xgb

model = xgb.train(...)
explainer = shap.TreeExplainer(model)        # for tree models — fast
shap_values = explainer.shap_values(X)

# Local explanation
shap.waterfall_plot(shap.Explanation(values=shap_values[i], base_values=explainer.expected_value, data=X.iloc[i]))

# Global summary
shap.summary_plot(shap_values, X)             # beeswarm
shap.summary_plot(shap_values, X, plot_type="bar")    # mean abs SHAP per feature

# Dependence plot (marginal effect)
shap.dependence_plot("feature_name", shap_values, X)
```

| Explainer | When |
|---|---|
| **TreeExplainer** | XGBoost / LightGBM / CatBoost / sklearn trees — fast |
| **DeepExplainer** | TensorFlow / Keras — uses DeepLIFT |
| **GradientExplainer** | Differentiable models |
| **KernelExplainer** | **Any** model — slow (model-agnostic) |
| **LinearExplainer** | Linear models |
| **PermutationExplainer** | Generic; permutes features |

#### SHAP visualizations

| Plot | What |
|---|---|
| **Waterfall** | One prediction's feature contributions |
| **Force plot** | Same; horizontal layout |
| **Summary plot (beeswarm)** | Distribution of SHAP per feature, color = feature value |
| **Bar plot** | Mean abs SHAP — global importance |
| **Dependence plot** | Feature value vs SHAP value (with interaction coloring) |
| **Decision plot** | Cumulative path of feature contributions |
| **Heatmap** | SHAP across instances (clustered) |

> **SHAP summary beeswarm + bar plot** are the two charts to default for global explanation.

#### LIME (Local Interpretable Model-agnostic Explanations)

```
1. Pick instance to explain
2. Generate perturbed neighbors (sample around it)
3. Get model predictions for neighbors
4. Fit interpretable model (linear / decision tree) locally with sample weights = distance kernel
5. Use the interpretable model's coefficients as the explanation
```

```python
from lime.lime_tabular import LimeTabularExplainer
explainer = LimeTabularExplainer(X_train.values, feature_names=feature_names, class_names=["churn"])
exp = explainer.explain_instance(X_test[0], model.predict_proba, num_features=10)
exp.show_in_notebook()
```

| Strength | Weakness |
|---|---|
| Model-agnostic | Sampling can be unstable |
| Intuitive | Local; doesn't aggregate well |
| Works for text / images | Hyperparameters affect output |

> **SHAP often preferred over LIME** for tabular — same model-agnostic story but more theoretically grounded and stable.

#### Partial Dependence (PDP) — global marginal effect

For each value of feature `j`, average prediction across all other features:

`PDP_j(v) = (1/n) Σ_i f(x_i with x_{i,j} = v)`

```python
from sklearn.inspection import partial_dependence, PartialDependenceDisplay
PartialDependenceDisplay.from_estimator(model, X, ["feature_a", "feature_b"], kind="average")

# Two-way interaction
PartialDependenceDisplay.from_estimator(model, X, [("feature_a", "feature_b")])
```

| Strength | Weakness |
|---|---|
| Easy to interpret | Unrealistic when features correlated (extrapolation) |
| Shows shape of relationship | Hides heterogeneity |

#### ICE (Individual Conditional Expectation) — per-instance PDP

```python
PartialDependenceDisplay.from_estimator(model, X, ["feature"], kind="both")    # PDP + ICE
```

> ICE shows **per-instance** curves. If they all look like the PDP, no heterogeneity. If they fan out / cross, heterogeneity matters.

#### ALE (Accumulated Local Effects)

Better than PDP when features are **correlated** — averages over **conditional** distribution rather than marginal:

```python
from PyALE import ale
ale_eff = ale(X=X, model=model, feature=["feature_a"], grid_size=20)
```

> Use ALE in production when features are correlated. PDP can hallucinate values that don't exist in the data.

#### Counterfactual explanations

"What's the **smallest change to features** that would flip the prediction?"

```python
from dice_ml import Dice, Data, Model

d = Data(dataframe=df, continuous_features=cont_cols, outcome_name="churn")
m = Model(model=model, backend="sklearn")
exp = Dice(d, m)
counterfactuals = exp.generate_counterfactuals(query_instance=X.iloc[[0]], total_CFs=4, desired_class="opposite")
```

| Strength | Weakness |
|---|---|
| Actionable: "Change X by Y to get approval" | May suggest infeasible changes |
| Aligns with GDPR Art 22 (right to explanation) | Multiple valid CFs; choose by feasibility |

#### Anchors

"**If these conditions hold**, the prediction stays the same with high probability."

```python
from alibi.explainers import AnchorTabular
anchor = AnchorTabular(model.predict, feature_names=feature_names)
anchor.fit(X_train.values)
result = anchor.explain(X_test[0], threshold=0.95)
print(result.anchor)        # ["age > 30", "income < 50000"]
```

> Anchors give **rule-based** local explanations. More interpretable than continuous SHAP values for some users.

#### Permutation importance (global)

```python
from sklearn.inspection import permutation_importance

result = permutation_importance(model, X_val, y_val, n_repeats=10, random_state=42)
imp = pd.Series(result.importances_mean, index=X.columns).sort_values(ascending=False)
```

> **Better than tree's built-in `feature_importances_`**, which is biased toward high-cardinality features. Permutation is model-agnostic.

#### Deep learning attribution

| Method | Detail |
|---|---|
| **Saliency / gradient** | `∂y/∂x` — basic |
| **Integrated gradients** | Path integral from baseline to input — better axioms |
| **GradCAM** | Class activation map for CNNs |
| **DeepLIFT** | Reference-based attribution |
| **Layer-wise relevance propagation** | Recursive backward attribution |
| **Attention weights** | Limited interpretability — debated |
| **TracIn** | Influence of training examples on test predictions |

```python
from captum.attr import IntegratedGradients

ig = IntegratedGradients(model)
attributions = ig.attribute(input_tensor, target=class_idx, n_steps=50)
```

#### LIME / SHAP for images / text

```python
# Text
explainer = shap.Explainer(model, masker=shap.maskers.Text(tokenizer))
shap_values = explainer(["I loved this movie"])
shap.plots.text(shap_values)

# Images
explainer = shap.GradientExplainer(model, X_background)
shap_values = explainer.shap_values(X_image, nsamples=200)
shap.image_plot(shap_values, X_image)
```

#### Pitfalls and limitations

| Issue | Detail |
|---|---|
| **Correlated features** | PDP / SHAP can attribute spuriously; ALE helps |
| **Extrapolation** | PDP averages over implausible values |
| **Adversarial explanations** | Models can be designed to fool LIME / SHAP |
| **Approximation error** | KernelSHAP / LIME are sampling-based |
| **Stability** | LIME especially can vary run-to-run |
| **"Explanation" ≠ causation** | Just describes model behavior, not real-world cause |

> **Don't confuse explanation with causation.** SHAP says how the model uses the feature; not whether changing the feature changes the outcome.

#### Compliance / regulatory

| Regulation | Requirement |
|---|---|
| **GDPR Art 22** | Right to "meaningful information about the logic involved" in automated decisions |
| **Equal Credit Opportunity Act** | Adverse action notices for credit decisions |
| **EU AI Act** | High-risk systems must be "transparent" |
| **HIPAA** | Often requires interpretable medical decisions |
| **SR 11-7** (Fed banking) | Model risk management |

> **Counterfactual explanations** map well to "right to explanation" under GDPR.

#### Choosing per use case

| Use case | Recommended method |
|---|---|
| **Debug model bug** | SHAP local + dependence plots |
| **Global feature importance** | Permutation importance / SHAP bar |
| **Stakeholder presentation** | SHAP summary + waterfall for examples |
| **Feature relationship shape** | PDP (or ALE if correlated) |
| **Heterogeneous effects** | ICE plots + SHAP dependence |
| **Adverse action notices** | Counterfactuals |
| **Image classification debug** | GradCAM / SHAP image |
| **Text NLP debug** | SHAP text / attention |
| **Trust & compliance** | Counterfactuals + interpretable surrogate |
| **Auditing fairness** | SHAP per protected attribute |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Treating built-in tree importance as truth | Use permutation / SHAP |
| PDP on correlated features | Use ALE |
| LIME without checking stability | Run multiple times; verify |
| SHAP bar plot only | Beeswarm reveals more |
| Extrapolating from limited data | Show confidence / range |
| Confusing local with global | Different questions, different methods |
| Reading attention as explanation | Attention is mechanism, not necessarily explanation |
| Only running on training data | Run on production / new data |
| One method only | Triangulate with multiple |
| Cherry-picked examples | Show distribution; check failures |

#### Workflow

| Step | Action |
|---|---|
| 1 | Train model; baseline performance |
| 2 | Global: permutation importance + SHAP summary |
| 3 | Local: SHAP waterfall on borderline / wrong predictions |
| 4 | Dependence plots for top features |
| 5 | Per-segment SHAP (fairness check) |
| 6 | Counterfactuals for actionable explanations |
| 7 | Document for stakeholders / model card |

#### Stakeholder communication

| Audience | What to show |
|---|---|
| **Engineers / DS** | SHAP summary + dependence; full code |
| **Product managers** | Bar chart of top features; example waterfalls |
| **Executives** | One slide: "Top 3 drivers" |
| **Regulators** | Model card + counterfactuals + per-segment performance |
| **Affected users** | Counterfactual or simple natural-language reason |

#### Tools

| Tool | Strength |
|---|---|
| **SHAP** | Canonical; many model types |
| **LIME** | Older but widely used |
| **InterpretML** | Microsoft; SHAP + glassbox models |
| **Alibi** | Counterfactuals + Anchors |
| **DiCE** | Diverse counterfactuals |
| **Captum** | PyTorch attribution |
| **TF Explain** | TF / Keras attribution |
| **What-If Tool** | Interactive Google tool |
| **Fiddler / Arize / WhyLabs** | Production observability + SHAP |

#### Glassbox models (interpretable by construction)

| Model | Detail |
|---|---|
| **Linear / logistic regression** | Coefficients = feature effect |
| **Decision tree (shallow)** | Visualizable rules |
| **GAM** (Generalized Additive Model) | Per-feature smooth functions |
| **EBM** (Explainable Boosting Machine) | Interpretable + competitive accuracy |
| **Decision rules / RuleFit** | Compact rule sets |

> **EBM (InterpretML)** often achieves accuracy near GBDT with full interpretability. Underused.

#### Decision tree

```
Why are you explaining?
├─ Debug model failures               → SHAP local + dependence plots
├─ Stakeholder buy-in / trust         → SHAP summary + simple examples
├─ Regulatory / compliance            → Counterfactuals + model card + glassbox if possible
├─ Fairness audit                     → SHAP per protected attribute + per-segment metrics
├─ Image / text task                  → GradCAM / Integrated Gradients / SHAP image
└─ Already deployed model in prod     → Production observability with SHAP (Fiddler / Arize)
```

**Rule of thumb:** **SHAP is the modern default** for tabular models — use **TreeExplainer** for tree models. Pair **permutation importance (global)** with **SHAP local explanations**. **Counterfactual explanations** for actionable / regulatory use. **PDP for shape, ALE for correlated features**. Don't confuse **explanation with causation**. For full interpretability, consider **glassbox models (EBM, GAM)**. Always **explain on production data**, not just training.
