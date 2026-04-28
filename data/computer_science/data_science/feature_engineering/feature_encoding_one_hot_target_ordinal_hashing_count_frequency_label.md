### Feature Encoding (one-hot, target, ordinal, hashing, count, frequency, label)

**When:** convert **categorical** features into numeric form for ML models. Choice of encoding has bigger impact than model choice for high-cardinality features. Each method has a specific use case — using the wrong one causes leakage, blowup, or weak signal.

**Schema (the encoding catalog):**

| Encoding | Output | Best for | Risk |
|---|---|---|---|
| **One-hot** | One binary column per value | Low cardinality (≤ 50), tree or linear | Curse of dimensionality |
| **Ordinal / label** | Single integer per value | Inherently ordered categories | Models may infer fake order |
| **Target / mean** | Replace value with target mean for that group | High cardinality, tree models | **Leakage if not done correctly** |
| **Frequency / count** | Replace value with its frequency / count | High cardinality | Loses category identity |
| **Hashing trick** | Hash value into K bins | Very high cardinality, online | Collisions |
| **Binary** | Encode label as binary digits | Medium cardinality | Less interpretable |
| **Embedding** | Learned dense vector | NN models, very high cardinality | Needs lots of data |
| **Leave-one-out (LOO)** | Target encoding excluding current row | Same as target, less leakage | Still need CV |
| **Catboost ordered TS** | Target stat using only "previous" rows | Time-aware target encoding | Works only with sequence |
| **Helmert / sum / polynomial** | Statistical contrasts | Linear regression with categorical | Niche |
| **WoE** (Weight of Evidence) | Log-odds transform | Credit-scoring (logistic) | Binary target only |

#### One-hot encoding

```python
import pandas as pd
df = pd.get_dummies(df, columns=["region"], drop_first=True)

# In sklearn pipelines
from sklearn.preprocessing import OneHotEncoder
ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
```

| When to use | Notes |
|---|---|
| Cardinality ≤ ~50 | Above this, dimensionality explodes |
| Linear models | Required (no native cat support) |
| Tree models | Often unnecessary; use ordinal or native categorical |
| With test set having unseen categories | Use `handle_unknown="ignore"` |

> **`drop_first=True`** drops one column to avoid perfect multicollinearity in linear models.

#### Ordinal / label encoding

```python
from sklearn.preprocessing import OrdinalEncoder
oe = OrdinalEncoder()
X_enc = oe.fit_transform(X[["category"]])

# Manual when order matters
size_map = {"S": 0, "M": 1, "L": 2, "XL": 3}
df["size_ordinal"] = df["size"].map(size_map)
```

| Use when | Avoid when |
|---|---|
| Truly ordered (size, education, rating) | Nominal categories — order is fake |
| Tree-based models (handle ordinal natively) | Linear models on nominal — false ordering bias |
| LightGBM `categorical_feature` parameter | — |

> Tree models split on `feature ≤ threshold`, so any encoding that's monotonic with target works for trees — even arbitrary integer label encoding is OK.

#### Target / mean encoding

Replace each category with the **mean of the target for that category**.

```python
# Naive (LEAKY)
df["region_target_mean"] = df.groupby("region")["target"].transform("mean")

# Per-fold to avoid leakage
from category_encoders import TargetEncoder
te = TargetEncoder(smoothing=10.0)
X_train_enc = te.fit_transform(X_train, y_train)
X_test_enc = te.transform(X_test)

# Smoothing formula:
# enc(c) = (n_c * mean_c + smoothing * global_mean) / (n_c + smoothing)
```

| Property | Detail |
|---|---|
| **Smoothing** | Pulls rare categories toward global mean — prevents overfitting |
| Out-of-fold encoding | Avoids leakage in training |
| Powerful for high-cardinality | Can replace 1000s of OHE columns |
| Risk | Leakage if used incorrectly |

> **Always cross-fit**: encode using **out-of-fold** target means, never the same fold the row belongs to.

#### Frequency / count encoding

```python
freq = df["category"].value_counts(normalize=True)
df["category_freq"] = df["category"].map(freq)
```

| Use case | Detail |
|---|---|
| High cardinality | Captures category prevalence as numeric |
| Combine with other features | Often paired with target encoding |
| Robust | No target dependency → no leakage |
| Limit | Two categories with same frequency become identical |

#### Hashing trick

```python
from sklearn.feature_extraction import FeatureHasher
hasher = FeatureHasher(n_features=2**16, input_type="string")
X_hashed = hasher.transform(df["category"].astype(str))
```

| Property | Detail |
|---|---|
| Constant memory | `n_features` bins regardless of cardinality |
| Online-friendly | No vocabulary needed |
| Collision risk | Different categories hash to same bin |
| Used by | Vowpal Wabbit, click-prediction systems |

#### CatBoost ordered target statistic

CatBoost computes target stats **using only previous rows in a permutation order** — eliminates leakage natively without explicit cross-validation.

```python
from catboost import CatBoostClassifier
cat_features = ["region", "device", "browser"]
model = CatBoostClassifier(cat_features=cat_features).fit(X, y)
```

> Use **CatBoost's native categorical handling** — best practical encoder for high-cardinality on tree models.

#### Embeddings (deep learning)

For neural networks, learn a dense vector per category:

```python
import torch.nn as nn
embedding = nn.Embedding(num_embeddings=10_000, embedding_dim=16)
```

| When | Detail |
|---|---|
| Very high cardinality | Better than OHE / hashing |
| Lots of training data | Embeddings need samples to learn |
| Cross-feature interactions | Concatenate / multiply embeddings |
| Pre-train on related task | Word2Vec-style |

#### Encoding by cardinality

| Cardinality | Recommended |
|---|---|
| Binary | Single 0/1 |
| 3–10 | One-hot |
| 10–50 | One-hot or ordinal (trees) |
| 50–500 | Target encoding (with CV) or frequency |
| 500–10,000 | Target encoding + frequency, or hashing |
| > 10,000 | Hashing or embedding |

#### Encoding by model type

| Model | Best encoding |
|---|---|
| **Linear / logistic regression** | One-hot (drop one) + scaling |
| **Decision tree / random forest** | Ordinal / label |
| **XGBoost** | Ordinal or target encoding (with CV); native via `enable_categorical=True` |
| **LightGBM** | Native `categorical_feature` |
| **CatBoost** | Native categorical handling |
| **Neural networks** | Embeddings or one-hot for low card |
| **kNN / SVM** | One-hot + scaling (distance matters) |

#### Combinations / interactions

```python
df["region_x_plan"] = df["region"].astype(str) + "_" + df["plan"].astype(str)
```

> Manually create interaction features for **likely-interacting** pairs; trees can find them automatically but slow on high cardinality.

#### Handling unseen categories at inference

| Encoding | Strategy for unseen |
|---|---|
| One-hot (sklearn) | `handle_unknown="ignore"` → all-zero row for new value |
| Target encoding | Use **global mean** for unseen |
| Frequency | Use **0** (or smallest seen frequency) |
| Hashing | Naturally handles — new strings hash to bins |
| Ordinal | `handle_unknown="use_encoded_value"`, `unknown_value=-1` |

#### Categorical NaN / missing

| Approach | Notes |
|---|---|
| Treat as own category | "Unknown" / `-1` |
| Impute mode + add `is_missing` indicator | Standard |
| Tree models | Often handle natively |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| **Target encoding without CV** | Severe leakage; out-of-fold encode |
| One-hot on 10k-cardinality column | Dimensionality blowup; switch to hashing or target |
| Ordinal on nominal categories with linear model | Implies fake ordering |
| Forgetting to handle unseen test categories | `handle_unknown="ignore"` |
| Encoding fit on full data | Fit on **train only** |
| Different encoders inconsistently across folds | Wrap in pipeline so it refits per fold |
| Mixing string and numeric in same column | Coerce types upfront |
| Encoding ID columns | Drop them — too many unique values, no signal |
| Encoding before splitting | Cross-fold leakage; split first |

#### Pipeline-correct encoding

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from category_encoders import TargetEncoder

preproc = ColumnTransformer([
    ("num", StandardScaler(), num_cols),
    ("ohe", OneHotEncoder(handle_unknown="ignore"), low_card_cols),
    ("target", TargetEncoder(smoothing=10), high_card_cols),
])
# Fit per fold automatically when wrapped in CV
```

#### Cardinality reduction tricks

| Trick | Effect |
|---|---|
| **Bucketize rare categories as "Other"** | Caps cardinality |
| **Frequency threshold** | Categories below `min_count` → "Other" |
| **Cluster similar categories** | Domain-driven (URL → top-level domain) |
| **Hash with small `n_features`** | Forced collisions |

```python
# Bucket rare categories
counts = df["category"].value_counts()
rare = counts[counts < 100].index
df["category"] = df["category"].where(~df["category"].isin(rare), other="Other")
```

#### Decision tree (encoding choice)

```
Categorical column?
├─ Linear / logistic regression
│  ├─ Cardinality ≤ ~50 → One-hot (drop one)
│  └─ Cardinality > ~50  → Target encoding with CV (or hashing)
├─ Tree-based model (XGBoost / LightGBM / CatBoost)
│  ├─ CatBoost                → Native categorical
│  ├─ LightGBM                 → categorical_feature parameter
│  ├─ XGBoost                  → enable_categorical=True or ordinal
│  └─ scikit-learn RF / DT     → Ordinal or one-hot
├─ Neural network
│  ├─ Cardinality < 100        → One-hot
│  └─ High cardinality          → Embedding
└─ Distance-based (kNN, SVM)    → One-hot + scaling
```

**Rule of thumb:** **encoding choice depends on model + cardinality**. **One-hot** for low-card linear; **ordinal / native categorical** for trees; **target encoding (with CV)** for high-card on trees; **hashing** for very high cardinality / online; **embeddings** for NNs. Always **fit encoders on train only**, **handle unseen test values**, and **cross-fold encode** anything target-derived to avoid leakage.
