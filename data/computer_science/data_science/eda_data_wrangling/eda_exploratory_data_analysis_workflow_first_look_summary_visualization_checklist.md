### EDA (Exploratory Data Analysis — workflow, first-look, summary, visualization, checklist)

**When:** **first thing you do** with any new dataset. Builds intuition, catches data quality issues, generates hypotheses, informs feature engineering. Skipping EDA is the most common reason ML projects fail silently — you fit a model on garbage and don't know it.

**Schema (the EDA workflow):**

| Phase | Question to answer |
|---|---|
| **1. Shape & schema** | How many rows / columns? What types? |
| **2. Univariate** | Distribution of each variable? |
| **3. Quality** | Missing? Duplicates? Outliers? |
| **4. Bivariate** | How do variables relate to the target / each other? |
| **5. Multivariate** | Interactions, structures, clusters? |
| **6. Time / drift** | If time-stamped, how does the distribution change over time? |
| **7. Hypothesis & next steps** | What's worth modeling? What needs cleaning? |

> **EDA is iterative**. Plot → notice anomaly → ask why → query → plot again. Resist the urge to start modeling.

#### First-look checklist (run on every new dataset)

```python
import pandas as pd
df = pd.read_csv(...)

print(df.shape)                              # (rows, cols)
print(df.dtypes)                              # column types
print(df.head())                              # peek
print(df.describe(include="all"))             # summary stats
print(df.isna().sum())                        # missing per column
print(df.duplicated().sum())                  # duplicate rows
print(df.memory_usage(deep=True).sum() / 1e6, "MB")
```

| Diagnostic | Red flag |
|---|---|
| `dtypes` | Mixed object types where you expected numeric |
| `nunique` per column | Constant columns (1 unique) — drop |
| `isna().mean()` | Columns with >50% missing — investigate or drop |
| `duplicated().sum()` | Many duplicates — root cause? |
| Inconsistent string formatting | "USA" vs "us" vs "U.S." — needs canonicalization |
| Unrealistic min/max | Negative ages, future dates, etc. |

#### Univariate plots

| Variable type | Plot |
|---|---|
| Continuous | Histogram + KDE; box plot for outliers |
| Categorical (low cardinality) | Bar chart of value counts |
| Categorical (high cardinality) | Top-N bar; "Other" bucket; word cloud last resort |
| Date / time | Line plot of counts over time |
| Boolean | Bar chart |
| Numeric ID | Don't plot — just check uniqueness |

```python
import seaborn as sns, matplotlib.pyplot as plt

# Continuous
sns.histplot(df["price"], kde=True, log_scale=True)
sns.boxplot(x=df["price"])

# Categorical
df["category"].value_counts().head(20).plot.bar()

# Time series
df.set_index("date")["metric"].plot()
```

#### Bivariate plots

| Pair | Plot |
|---|---|
| Continuous × Continuous | Scatter, hexbin, 2D density |
| Continuous × Categorical | Box plot, violin, strip plot |
| Categorical × Categorical | Crosstab heatmap, mosaic |
| Continuous × Time | Line, rolling mean |
| Target × Anything | Same as above with target as one axis |

```python
sns.scatterplot(data=df, x="ad_spend", y="revenue", hue="region")
sns.boxplot(data=df, x="region", y="revenue")
pd.crosstab(df["region"], df["plan"], normalize="index")
```

#### Quick correlation check

```python
df.corr(numeric_only=True)
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="coolwarm", center=0)
```

> Use **Spearman** if relationships might be nonlinear monotonic; **Pearson** for linear.

#### Multivariate / structure

| Tool | When |
|---|---|
| **Pair plot** (`sns.pairplot`) | Small datasets (≤ 10 numeric features) |
| **PCA** scatter (first 2 PCs) | Linear structure, dimensionality reduction |
| **t-SNE / UMAP** | Non-linear clusters in high-d |
| **Cluster heatmap** | Hierarchical clustering of features / samples |
| **Network graph** | If correlations are sparse or graph-like |

> Don't dump 50 columns into `pairplot` — pre-select.

#### Time-aware EDA

| Check | Why |
|---|---|
| Distribution by time bucket (week / month) | Detect drift |
| Trend / seasonality plot | STL decomposition |
| Per-period summary stats | Mean / std / missing-rate over time |
| New users vs returning users by cohort | Retention curves |
| Funnel by period | Conversion rate change |

#### Categorical-target EDA (classification)

```python
# Class balance
df["target"].value_counts(normalize=True)

# Feature mean by target class
df.groupby("target")["feature"].agg(["mean", "median", "std", "count"])

# Visual
sns.boxplot(data=df, x="target", y="feature")
```

| Diagnostic | Action |
|---|---|
| Severe imbalance (e.g., 99/1) | Plan for resampling / class weights / focal loss |
| One feature dominates target prediction | Suspect leakage |
| Per-class distributions overlap heavily | Hard problem; need more features |

#### Continuous-target EDA (regression)

| Plot | Insight |
|---|---|
| Scatter of feature vs target | Linearity, outliers |
| Residual plot of naive baseline | Where the model could improve |
| QQ plot of target | Normality (matters for some models) |
| Log/sqrt transform tests | If target is right-skewed |

#### Outlier detection (quick)

| Method | Threshold |
|---|---|
| Z-score | `|z| > 3` |
| IQR | Below `Q1 − 1.5·IQR`, above `Q3 + 1.5·IQR` |
| MAD (robust) | `|x − median| / MAD > 3.5` |
| Isolation Forest | Anomaly score < threshold |
| Visual (boxplot) | Eyeball |

> Don't auto-drop outliers. Investigate them — often **bugs**, **fraud**, or **the most interesting subset of users**.

#### Cardinality check (for categorical)

```python
nunique = df.select_dtypes(include="object").nunique().sort_values(ascending=False)
print(nunique.head(20))
```

| Cardinality | Strategy |
|---|---|
| ≤ 10 | One-hot encode |
| 10–100 | One-hot or target encoding |
| 100–1000 | Target encoding, frequency encoding, hashing |
| > 1000 | Hashing trick or embeddings |
| **= row count** | Likely an ID — don't encode |

#### Data leakage red flags

| Red flag | Investigate |
|---|---|
| Feature with near-perfect correlation to target | Likely a future leak |
| Feature available only post-event (e.g., "shipping_date" predicting "purchased") | Leakage |
| Feature engineered with future window | Time leak |
| Group statistics computed on full data before split | Cross-fold leak |
| Categorical encoding fit on full data | Subtle leak |

> **Plot top features vs target.** If accuracy looks "too good", look here first.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Skipping EDA → modeling on broken data | Always EDA first |
| Plotting without sampling on huge data | `df.sample(10_000)` for speed |
| Treating ID columns as features | Drop them (or use only as keys) |
| Mixing types per column (numbers stored as strings) | Coerce with `pd.to_numeric(errors="coerce")` |
| Ignoring tz-naive vs tz-aware datetimes | Standardize tz early |
| Encoding object columns implicitly | Be explicit about types |
| Looking only at `describe()` | Use plots — `describe` hides bimodality, outliers |
| Assuming missingness is MCAR | See missing-data memo |

#### Saving an EDA report

```python
# Quick automated report
from ydata_profiling import ProfileReport
ProfileReport(df, title="EDA").to_file("eda.html")

# Or sweetviz
import sweetviz as sv
sv.analyze(df).show_html("sweetviz.html")
```

> Use as a **starting point** — these tools won't catch domain-specific issues.

#### Time / sample budget

For typical project:

| Phase | Time share |
|---|---|
| EDA + cleaning | 30–60% |
| Feature engineering | 20–30% |
| Modeling | 10–20% |
| Validation + reporting | 10–20% |

> If you're spending < 30% on EDA, you're probably modeling on bad data.

#### EDA output for stakeholders

| Artifact | Purpose |
|---|---|
| Schema doc | What each column means |
| Quality summary | Missing %, duplicates, outliers |
| Distribution plots for top variables | Build intuition |
| Target relationships | Drives feature engineering |
| Time-stability check | Drift detection |
| Open questions | What needs domain input |

#### Pandas EDA cheatsheet

```python
df.info()
df.describe(include="all")
df.nunique()
df.isna().mean().sort_values(ascending=False)        # missing %
df.duplicated().sum()
df["col"].value_counts(dropna=False).head(20)
df.select_dtypes(include="number").skew()
df["date"].dt.to_period("M").value_counts().sort_index()
df.groupby("group")["target"].agg(["mean", "median", "count"])
```

**Rule of thumb:** **EDA before modeling, every time**. Run the **first-look checklist**, plot **distributions + bivariate target relationships**, check for **missing / duplicates / leakage / drift**. Don't auto-drop outliers — investigate them. Save a **profiling report** as a starting point. Spend at least **30% of project time on EDA + cleaning** — it's not optional, and it's the highest-ROI phase.
