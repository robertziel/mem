### Probability Calibration (Platt scaling, isotonic, temperature scaling, reliability diagram, Brier)

**When:** model outputs need to be **probabilities you can trust** — risk scoring, expected-value computations, threshold decisions, ensemble combination. Many models (SVM, random forest, neural nets, gradient boosting) produce **uncalibrated** scores; "0.8" doesn't mean 80% probability of positive.

**Schema:**

| Concept | Detail |
|---|---|
| **Calibrated model** | Among samples with `p̂ = 0.7`, ~70% are actually positive |
| **Uncalibrated** | Predicted scores don't match observed frequencies |
| **Reliability diagram** | Plot predicted prob vs actual fraction; ideal is diagonal |
| **Brier score** | Mean squared error between probs and outcomes; lower = better |
| **ECE** (Expected Calibration Error) | Weighted average miscalibration |
| **MCE** (Max Calibration Error) | Worst-bucket miscalibration |

> **Calibration ≠ accuracy**. A model can have 90% AUC but predicted probabilities all in [0.4, 0.6] (poor calibration).

#### Why it matters

| Use case | Why calibrated probs matter |
|---|---|
| Cost-sensitive decisions | `expected_loss = p · cost_FN + (1 - p) · cost_FP` |
| Combining models | Naive averaging requires comparable scales |
| Risk-based ranking | Probabilities of different events comparable |
| Triggering downstream actions | "If P(churn) > 0.5, send retention email" |
| User-facing probabilities | "30% chance of rain" |
| Ensemble methods | Stacking / weighted average |

#### Methods that produce uncalibrated probabilities

| Model | Why miscalibrated |
|---|---|
| **SVM** | Doesn't output probs; sigmoid mapping is approximate |
| **Random Forest** | Voting averages produce U-shaped scores |
| **Boosted trees** (XGBoost, etc.) | Margin-based; tend to push toward 0/1 |
| **Neural networks** | Modern overparameterized NNs are over-confident |
| **Naive Bayes** | Strong independence assumption distorts |

#### Methods that are usually well-calibrated

| Model | Why |
|---|---|
| **Logistic regression** (with proper data) | Probabilistic by design |
| **Calibrated NN with cross-entropy + dropout** | If trained correctly |
| **Bayesian models with proper priors** | Posterior is calibrated by construction |
| **Generative models with correct likelihood** | Conditional probabilities natural |

#### Reliability diagram

```python
import matplotlib.pyplot as plt
from sklearn.calibration import calibration_curve

fraction_pos, mean_pred = calibration_curve(y_true, y_prob, n_bins=10)
plt.plot([0, 1], [0, 1], "k--", label="perfect")
plt.plot(mean_pred, fraction_pos, marker="o", label="model")
plt.xlabel("Mean predicted probability"); plt.ylabel("Fraction of positives")
plt.legend()
```

| Curve shape | Diagnosis |
|---|---|
| Below diagonal | Over-confident (predicts 0.8 but actual 0.6) |
| Above diagonal | Under-confident (predicts 0.4 but actual 0.6) |
| S-curve | Common in tree-based ensembles |
| Steep on edges, flat middle | Uncalibrated boosted trees |

#### Calibration metrics

##### Brier score

`Brier = (1/n) · Σ (p̂ᵢ - yᵢ)²`

```python
from sklearn.metrics import brier_score_loss
brier = brier_score_loss(y_true, y_prob)
```

| Property | Detail |
|---|---|
| Range | [0, 1] (lower better) |
| Decomposition | `Brier = uncertainty + reliability − resolution` |
| Strictly proper scoring rule | Optimal at true probabilities |

##### ECE (Expected Calibration Error)

```python
def ece(y_true, y_prob, n_bins=10):
    bins = np.linspace(0, 1, n_bins + 1)
    bin_idx = np.digitize(y_prob, bins) - 1
    ece_val = 0
    for b in range(n_bins):
        mask = bin_idx == b
        if mask.sum() == 0: continue
        avg_pred = y_prob[mask].mean()
        actual = y_true[mask].mean()
        ece_val += (mask.sum() / len(y_true)) * abs(avg_pred - actual)
    return ece_val
```

#### Calibration methods

##### Platt scaling (logistic regression on scores)

Fit a logistic regression mapping uncalibrated scores → calibrated probabilities:

`p_calibrated = 1 / (1 + exp(A · score + B))`

```python
from sklearn.calibration import CalibratedClassifierCV

cal = CalibratedClassifierCV(base_estimator=svm, method="sigmoid", cv=5)
cal.fit(X_train, y_train)
calibrated_probs = cal.predict_proba(X_test)
```

| Pro | Con |
|---|---|
| Simple, parametric | Assumes sigmoidal miscalibration |
| Few parameters → less overfit | Inflexible for complex shapes |
| Standard for SVM | Less effective for tree ensembles |

##### Isotonic regression (non-parametric)

Fit a **monotone non-decreasing** mapping:

```python
cal = CalibratedClassifierCV(base_estimator=rf, method="isotonic", cv=5)
cal.fit(X_train, y_train)
```

| Pro | Con |
|---|---|
| Flexible, non-parametric | Needs more data to avoid overfitting |
| Handles arbitrary monotonic shape | More parameters |
| Recommended for trees / boosting | n ≥ 1000 typical for stability |

##### Temperature scaling (deep networks)

Single scalar `T` divides logits before softmax:

`p = softmax(logits / T)`

```python
import torch.nn as nn

class TemperatureScaling(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
        self.temperature = nn.Parameter(torch.ones(1))
    def forward(self, x):
        logits = self.model(x)
        return logits / self.temperature

# Train: minimize NLL on validation set, frozen model
optimizer = torch.optim.LBFGS([ts.temperature])
def closure():
    optimizer.zero_grad()
    loss = nn.CrossEntropyLoss()(ts(X_val) / ts.temperature, y_val)
    loss.backward()
    return loss
optimizer.step(closure)
```

| Pro | Con |
|---|---|
| Single parameter | Doesn't fix per-class miscalibration |
| Fast | Less flexible than per-class scaling |
| State of art for modern NNs | Doesn't change ranking — only confidence |

> **Temperature scaling is the standard for deep learning** post-hoc calibration. Reliable, fast, single hyperparameter.

##### Other modern methods

| Method | What |
|---|---|
| **Histogram binning** | Average per-bin actual rates |
| **BBQ** (Bayesian Binning into Quantiles) | Bayesian histogram |
| **Beta calibration** | Beta distribution-based parametric |
| **Vector / matrix scaling** | Per-class calibration for multi-class |
| **Dirichlet calibration** | Multi-class extension |
| **Spline-based** | Smooth non-parametric |

#### Calibration vs sharpness trade-off

| Property | Detail |
|---|---|
| **Calibration** | Predicted probs match observed frequencies |
| **Sharpness** | Predictions concentrated near 0 / 1 |
| **Trade-off** | Perfectly calibrated baseline = `p̂ = base_rate` always; sharp but uncalibrated = trees |

> **Goal: maximally sharp subject to being calibrated.** Best models are sharp + calibrated.

#### Workflow

| Step | Action |
|---|---|
| 1. Train base model | Standard training |
| 2. Plot reliability diagram on validation | Diagnose miscalibration |
| 3. Pick method | Platt for sigmoidal; isotonic for arbitrary; temperature for NN |
| 4. Fit calibrator on **separate calibration set** | Avoid double-dipping training data |
| 5. Re-evaluate Brier / ECE | Confirm improvement |
| 6. Re-tune decision thresholds | Calibrated probs may shift optimal threshold |

#### Calibration in CalibratedClassifierCV

```python
from sklearn.calibration import CalibratedClassifierCV

# Wraps any sklearn classifier; uses CV for calibration
cal = CalibratedClassifierCV(
    estimator=base_model,
    method="isotonic",                 # or "sigmoid" (Platt)
    cv=5,                               # k-fold or "prefit"
)
cal.fit(X_train, y_train)
```

| `cv` | Behavior |
|---|---|
| Integer k | Train base model on k-1 folds, calibrate on remaining |
| `"prefit"` | Pass already-fitted model; calibrate on the data passed to .fit |

#### Multi-class calibration

| Method | Detail |
|---|---|
| **One-vs-rest with sigmoid** | Per-class Platt |
| **One-vs-rest with isotonic** | Per-class isotonic |
| **Temperature scaling** | Single T for all classes |
| **Vector scaling** | Per-class temperature |
| **Matrix / Dirichlet scaling** | Linear transform of logits |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Calibrate on training data | Use held-out calibration set |
| Compare AUROC of base vs calibrated | AUROC unchanged by monotonic calibration; use Brier / ECE |
| Apply Platt to severely non-sigmoidal scores | Use isotonic |
| Apply isotonic to small data | Overfits — use Platt or histogram |
| Forget to refit threshold after calibration | Optimal threshold may shift |
| Stack uncalibrated models | Mismatched scales |
| Report 95% CI without calibration | "95% confidence" without calibration is meaningless |
| Skip calibration "because we use AUC" | If you make decisions from probabilities, calibrate |

#### Decision tree

```
Model type?
├─ SVM (decision function)         → Platt scaling
├─ Random forest / ExtraTrees      → Isotonic regression
├─ XGBoost / LightGBM / CatBoost   → Isotonic (with sufficient data) or Platt
├─ Logistic regression              → Usually already calibrated
├─ Naive Bayes                      → Isotonic or Platt
└─ Neural network                   → Temperature scaling

Data size?
├─ < 1000                           → Platt (parametric, few params)
├─ ≥ 1000                            → Isotonic (more flexible)
└─ Multi-class                      → Per-class or matrix scaling
```

#### Calibration in production

| Concern | Mitigation |
|---|---|
| Calibration drifts with concept drift | Refit calibrator periodically |
| Different calibration per segment | Per-segment calibration |
| Online calibration | Online Platt / isotonic variants |
| Re-calibrate after retraining | Always |

#### Examples

##### Refit threshold after calibration

```python
# Before calibration: optimal threshold at ~0.3 (model over-confident)
# After calibration: optimal threshold at ~0.5 (matches reality)

# Always recompute optimal threshold on calibrated probs
probs_cal = cal.predict_proba(X_val)[:, 1]
precision, recall, thresholds = precision_recall_curve(y_val, probs_cal)
f1 = 2 * precision * recall / (precision + recall + 1e-9)
best_t = thresholds[np.argmax(f1[:-1])]
```

##### Reporting calibration

| Metric | Pre-calibration | Post-calibration |
|---|---|---|
| AUROC | 0.85 | 0.85 (unchanged) |
| Brier score | 0.18 | 0.12 |
| ECE | 0.12 | 0.03 |
| Reliability diagram | S-shape | Near-diagonal |

> Always report **calibration metrics + reliability diagram**, not just discrimination.

**Rule of thumb:** **calibrate models that produce uncalibrated probabilities**. Use **Platt** for SVM / sigmoidal miscalibration, **isotonic** for trees / boosting (when n ≥ 1000), **temperature scaling** for neural networks. Always **fit calibration on held-out data**. Report **Brier / ECE + reliability diagram**, not just AUROC. **Refit decision thresholds** after calibration. AUROC doesn't change — but every probability-based decision improves.
