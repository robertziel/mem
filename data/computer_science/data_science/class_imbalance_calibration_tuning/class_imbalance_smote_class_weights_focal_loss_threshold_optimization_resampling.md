### Class Imbalance (SMOTE, class weights, focal loss, threshold optimization, resampling)

**When:** binary / multiclass classification with **rare positive class** — fraud detection, medical screening, churn, click-through prediction. With 99% negatives, default `accuracy` is meaningless; the model can score 99% by always predicting majority. Imbalance handling is essential.

**Schema (the four levers):**

| Lever | What |
|---|---|
| **Resampling** | Oversample minority / undersample majority |
| **Class weights** | Make minority errors cost more during training |
| **Loss function** | Focal loss, weighted cross-entropy |
| **Threshold** | Tune decision boundary post-training |
| **Algorithm choice** | Some algos (XGBoost, LightGBM) handle natively |

> **Threshold tuning + class weights** are usually the simplest effective fixes. **SMOTE** is overrated for tabular tree models.

#### Imbalance ratios — when to act

| Ratio | Severity |
|---|---|
| 1:2 | Minor — tree models handle natively |
| 1:10 | Moderate — class weights help |
| 1:100 | Severe — multiple techniques |
| 1:1000+ | Extreme — specialized methods (anomaly detection framing) |

#### Resampling methods

| Method | What |
|---|---|
| **Random oversampling** | Duplicate minority class | Risk of overfitting |
| **SMOTE** | Synthetic samples by interpolating minority neighbors | Standard oversampling |
| **ADASYN** | SMOTE that focuses on hard-to-learn samples | Variant |
| **Borderline-SMOTE** | Only synthesize near class boundary | Variant |
| **Random undersampling** | Drop majority samples | Loses information |
| **Tomek links** | Remove pairs that are different-class nearest neighbors | Cleans boundary |
| **NearMiss** | Sample majority by distance to minority | Variant |
| **Combined: SMOTE + Tomek** | Oversample then clean | Common combo |

```python
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from imblearn.combine import SMOTETomek

smote = SMOTE(sampling_strategy=0.3, k_neighbors=5, random_state=42)
X_res, y_res = smote.fit_resample(X_train, y_train)

# Combined
smt = SMOTETomek(random_state=42)
X_res, y_res = smt.fit_resample(X_train, y_train)
```

| Pitfall | Fix |
|---|---|
| Resample test set | **NEVER** — only train; evaluate on real distribution |
| SMOTE on categorical features | Doesn't make sense to interpolate; use SMOTE-NC |
| SMOTE on high-d data | Synthetic points become uninformative |
| Resample before splitting | Leakage |

> **Modern view:** SMOTE often fails to help (or hurts) tree-based models. Class weights + threshold tuning often work as well or better.

#### Class weights

```python
# Sklearn — automatic
from sklearn.linear_model import LogisticRegression
lr = LogisticRegression(class_weight="balanced")           # 1 / class_freq

# XGBoost
xgb_model = xgb.XGBClassifier(scale_pos_weight=neg/pos)    # ratio-based

# LightGBM
lgb_model = lgb.LGBMClassifier(class_weight="balanced")

# Custom weights
weights = {0: 1.0, 1: 10.0}                                # 10× weight on positives
```

> **`scale_pos_weight = #neg / #pos`** is the standard XGBoost setting. Often equally effective as SMOTE with no synthetic data overhead.

#### Focal loss (deep learning)

Down-weights easy examples; focuses on hard ones:

`FL(p_t) = -α (1 - p_t)^γ log(p_t)`

| Parameter | Effect |
|---|---|
| `α` | Class weighting (like balanced) |
| `γ` (focusing) | 0 → cross-entropy; 2–5 → focal effect |

```python
import torch.nn.functional as F

def focal_loss(logits, targets, alpha=0.25, gamma=2.0):
    p = torch.sigmoid(logits)
    pt = p * targets + (1 - p) * (1 - targets)
    alpha_t = alpha * targets + (1 - alpha) * (1 - targets)
    return -(alpha_t * (1 - pt) ** gamma * torch.log(pt + 1e-8)).mean()
```

> **Used in object detection** (RetinaNet, Lin et al. 2017) and modern imbalanced classification. `γ = 2` is typical.

#### Threshold optimization

Default 0.5 threshold is rarely optimal for imbalanced data. Tune:

| Strategy | Goal |
|---|---|
| **Maximize F1** | Balance precision / recall |
| **Maximize F-β** | Weight recall vs precision |
| **Maximize Youden's J** | `sensitivity + specificity − 1` |
| **Cost-sensitive** | Minimize `c_FP · FP + c_FN · FN` |
| **Top-K precision** | Pick threshold giving top-K predictions |
| **Set recall target** | Find threshold yielding target recall |

```python
from sklearn.metrics import precision_recall_curve

probs = model.predict_proba(X_val)[:, 1]
precision, recall, thresholds = precision_recall_curve(y_val, probs)
f1 = 2 * precision * recall / (precision + recall + 1e-9)
best_threshold = thresholds[np.argmax(f1[:-1])]
```

> **Always tune threshold on a validation set, not the test set.** Re-tune as data drifts.

#### Cost-sensitive thresholding

When false negatives and false positives have **different business costs**:

```python
def expected_cost(y_true, probs, threshold, cost_fn=10, cost_fp=1):
    preds = probs > threshold
    fp = ((preds == 1) & (y_true == 0)).sum()
    fn = ((preds == 0) & (y_true == 1)).sum()
    return cost_fn * fn + cost_fp * fp

# Find threshold minimizing expected cost
best_t = min(np.linspace(0, 1, 100),
             key=lambda t: expected_cost(y_val, probs, t))
```

> Optimize for **expected dollar cost**, not statistical metric. Required for medical / fraud / safety applications.

#### Metric picker for imbalance

| Metric | When |
|---|---|
| **Accuracy** | **Useless** at imbalance — don't report alone |
| **Precision** | "When I predict positive, how often correct?" |
| **Recall (sensitivity)** | "Of all positives, how many caught?" |
| **F1** | Balance precision / recall |
| **F-β** (β = 2 favors recall) | When recall matters more |
| **AUROC** | Overall ranking; can be misleadingly high |
| **AUPRC** | **Better for severe imbalance** |
| **MCC** (Matthews correlation) | Robust to imbalance |
| **Cohen's kappa** | Agreement-corrected accuracy |
| **Cost-weighted error** | Business-aligned |
| **Brier score** | Probability calibration |
| **Top-K precision** | When we only act on top predictions |

> **Default for imbalanced**: AUPRC + F1 + cost-weighted. Don't rely on AUROC alone.

#### Algorithm-specific tips

| Algorithm | Imbalance handling |
|---|---|
| **Logistic regression** | `class_weight="balanced"` + threshold tuning |
| **Random forest** | `class_weight="balanced"` or `class_weight="balanced_subsample"` |
| **XGBoost** | `scale_pos_weight = #neg / #pos` |
| **LightGBM** | `class_weight` or `is_unbalance=True` |
| **CatBoost** | `class_weights` or `auto_class_weights="Balanced"` |
| **SVM** | `class_weight="balanced"` |
| **Neural network** | Focal loss / weighted cross-entropy |
| **k-NN** | Distance-weighted; oversampling helps less |
| **Naive Bayes** | Just train; tune threshold |

#### Imbalance pipeline

```python
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

pipeline = ImbPipeline([
    ("scale", StandardScaler()),
    ("smote", SMOTE(random_state=42)),     # only applied during training
    ("model", LogisticRegression(class_weight="balanced")),
])
pipeline.fit(X_train, y_train)             # SMOTE only on train
```

> **`imblearn.pipeline.Pipeline`** ensures SMOTE only fits on training folds during CV — sklearn's regular Pipeline doesn't do this correctly.

#### One-class / anomaly detection framing

When positives are **extremely rare** (1:10000+), don't frame as classification:

| Technique | Use |
|---|---|
| **Isolation Forest** | Unsupervised |
| **One-Class SVM** | Boundary on normal data |
| **Autoencoder reconstruction error** | Deep anomaly detection |
| **Statistical thresholds** | Univariate |

#### Stratified k-fold (essential for CV)

```python
from sklearn.model_selection import StratifiedKFold
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
```

> Maintains class distribution across folds — critical for imbalanced data. Random k-fold can leave a fold with **zero positives**.

#### Visualization

| Plot | Use |
|---|---|
| **Confusion matrix** | Easy diagnosis |
| **Precision-recall curve** | Better than ROC for imbalance |
| **Calibration plot** | Are probabilities trustworthy? |
| **Lift / gain chart** | Operational; "what fraction of positives in top X%?" |
| **Cumulative response curve** | Marketing context |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Reporting accuracy on imbalanced | Use F1 / AUPRC / MCC |
| Default 0.5 threshold | Always tune |
| SMOTE on test set | Never — only train |
| SMOTE before split | Leakage |
| Random k-fold without stratification | Folds may have 0 positives |
| Only optimizing for accuracy | Cost-weighted is more useful |
| Ignoring calibration after class weights | May need re-calibration (Platt) |
| One technique only | Combine: weights + threshold tuning |
| Test on resampled data | Wrong distribution |

#### Decision tree

```
Imbalance ratio?
├─ < 1:5                              → Default training; possibly threshold-tune
├─ 1:5 to 1:50                         → Class weights / scale_pos_weight + threshold tuning
├─ 1:50 to 1:1000                      → Add SMOTE/resampling + class weights + threshold
├─ > 1:1000                            → Anomaly detection framing
└─ Multi-class with rare classes        → Class weights + macro-F1 metric
```

#### Modern view: what works in practice

For **tree-based models** (XGBoost, LightGBM) on tabular:

| Technique | Effectiveness |
|---|---|
| `scale_pos_weight` | ✓ Effective |
| Threshold tuning | ✓ Effective |
| SMOTE | ✗ Often no improvement |
| Random oversampling | ✗ Risk of overfit |
| Random undersampling | ~ Mixed |

For **deep learning**:

| Technique | Effectiveness |
|---|---|
| Class weights / focal loss | ✓ Effective |
| Oversampling | ✓ Effective for image/text |
| SMOTE in feature space | ~ Mixed |
| Threshold tuning | ✓ Always |

#### Examples

##### Fraud detection (1:1000)

```python
xgb_model = xgb.XGBClassifier(
    scale_pos_weight=1000,
    eval_metric="aucpr",
).fit(X_train, y_train, eval_set=[(X_val, y_val)], early_stopping_rounds=50)

# Threshold for top-1% precision
probs = xgb_model.predict_proba(X_val)[:, 1]
threshold = np.quantile(probs, 0.99)
```

##### Medical screening (1:100, recall-critical)

```python
lr = LogisticRegression(class_weight={0: 1, 1: 100}).fit(X_train, y_train)
probs = lr.predict_proba(X_val)[:, 1]

# Threshold for 95% recall (don't miss positives)
recall_target = 0.95
thresholds = np.sort(probs[y_val == 1])[::-1]
threshold = thresholds[int(len(thresholds) * recall_target) - 1]
```

##### Rare disease classification (multi-class, very rare)

```python
from sklearn.ensemble import RandomForestClassifier
rf = RandomForestClassifier(class_weight="balanced_subsample", n_estimators=500).fit(X_train, y_train)
# Macro-F1 (averages F1 per class equally)
from sklearn.metrics import f1_score
print(f1_score(y_val, rf.predict(X_val), average="macro"))
```

**Rule of thumb:** **threshold tuning + class weights** are the highest-ROI imbalance fixes. **SMOTE often doesn't help tree models** — start with `scale_pos_weight`. **Always evaluate with AUPRC / F1 / MCC**, not accuracy. **Use stratified CV**. For severe imbalance (1:1000+), consider **anomaly detection framing** instead of classification. Optimize for **business cost**, not just statistical metric.
