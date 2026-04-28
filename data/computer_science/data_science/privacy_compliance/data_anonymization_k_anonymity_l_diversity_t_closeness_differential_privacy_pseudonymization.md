### Data Anonymization (k-anonymity, l-diversity, t-closeness, differential privacy, pseudonymization)

**When:** **release / share data** (research, analytics, third-party) without exposing individuals. The discipline of **statistical disclosure control** — different threats, different techniques. "Just remove names" is **never enough**.

**Schema (the threat model):**

| Threat | Detail |
|---|---|
| **Identity disclosure** | Match a record to a specific person |
| **Attribute disclosure** | Learn a person's sensitive attribute |
| **Membership inference** | Tell if a person was in the dataset |
| **Reconstruction** | Reverse-engineer raw data from aggregates |

> The Netflix Prize was de-anonymized using IMDb ratings. AOL search-log release de-anonymized via search content. Naive anonymization fails repeatedly.

#### Categories of attributes

| Category | Examples |
|---|---|
| **Direct identifier** | Name, SSN, email, phone — must be removed |
| **Quasi-identifier (QID)** | Age, ZIP, gender, occupation — combinations identify individuals |
| **Sensitive** | Disease, salary, religion — what we want to protect |
| **Non-sensitive** | Other |

> Sweeney (2002): **87%** of US population identifiable by `(ZIP, birthdate, gender)`. Removing names is ~useless.

#### k-anonymity

Each record's QID values match **at least `k − 1` others** in the dataset. So an attacker can't narrow a record to fewer than `k` people.

**Achieved via:**

| Technique | Detail |
|---|---|
| **Generalization** | Replace exact value with range (Age `35` → `30–40`) |
| **Suppression** | Remove cells / records that can't be generalized enough |
| **Microaggregation** | Replace QID values with cluster centroid |
| **Top / bottom coding** | Cap extremes (e.g., `salary > 200K` → `200K+`) |

```
Original                          k=3 anonymized
ZIP    Age   Disease              ZIP*   Age*    Disease
12345  29    flu                  123**  20-30   flu
12346  30    flu                  123**  20-30   flu
12347  29    cold                 123**  20-30   cold
54321  45    cancer               543**  40-50   cancer
54322  47    cancer               543**  40-50   cancer
54323  46    diabetes             543**  40-50   diabetes
```

| Pitfall | Detail |
|---|---|
| **Homogeneity attack** | If all `k` records have the same sensitive value, attacker still learns it |
| **Background knowledge attack** | Attacker who knows extra info can narrow further |

#### l-diversity (extends k-anonymity)

Each equivalence class has **at least `l` distinct sensitive values**. Defends against homogeneity.

| Variant | Detail |
|---|---|
| **Distinct l-diversity** | At least `l` distinct sensitive values per group |
| **Entropy l-diversity** | Entropy of sensitive values per group ≥ log(l) |
| **Recursive (c, l)-diversity** | Most-frequent value can't be `c` times more common than least-frequent |

> Still vulnerable to **skewness attacks** (if one value is very common in population, presence in the group is informative).

#### t-closeness (extends l-diversity)

Distribution of sensitive values within each group is **at most `t` from the global distribution** (e.g., Earth Mover's distance ≤ t).

> Strongest of the three. Attacker can't learn that a person's group has different distribution than population.

#### Hierarchy of strength

| Property | Defends against |
|---|---|
| **Removed direct IDs** | Naive lookup |
| **k-anonymity** | + Linkage from QIDs |
| **l-diversity** | + Homogeneity |
| **t-closeness** | + Skewness in distribution |
| **Differential privacy** | + Membership inference (gold standard) |

#### Differential Privacy (DP) — the modern gold standard

**Definition:** A randomized algorithm `M` is `(ε, δ)`-DP if for all neighboring datasets `D, D'` differing in one record:

`P(M(D) ∈ S) ≤ e^ε · P(M(D') ∈ S) + δ`

| Parameter | Detail |
|---|---|
| **`ε` (privacy budget)** | Smaller = more private (typical 0.1–10) |
| **`δ`** | Probability of catastrophic privacy failure (typical < 1/n) |
| Composition | Repeated queries consume budget |

> DP is **mathematically rigorous**. Guarantees **no individual's presence / absence significantly affects the output**.

#### DP mechanisms

| Mechanism | Use |
|---|---|
| **Laplace mechanism** | Add Laplace noise to counts / sums; scale = sensitivity / ε |
| **Gaussian mechanism** | Add Gaussian noise; supports `(ε, δ)`-DP |
| **Exponential mechanism** | For non-numeric outputs; pick by score with prob `∝ exp(score)` |
| **DP-SGD** | DP for ML training; clip per-sample gradients + add noise |

```python
# Laplace mechanism for counting query
def dp_count(true_count, epsilon, sensitivity=1):
    noise = np.random.laplace(0, sensitivity / epsilon)
    return true_count + noise

# Gaussian mechanism
def dp_sum(values, epsilon, delta, sensitivity):
    sigma = sensitivity * np.sqrt(2 * np.log(1.25 / delta)) / epsilon
    return values.sum() + np.random.normal(0, sigma)
```

#### DP-SGD (DP for ML training)

```
For each minibatch:
  1. Compute per-sample gradients
  2. Clip each per-sample gradient to max norm C
  3. Sum gradients + add Gaussian noise σ · C
  4. Update model with noisy gradient
```

```python
# Opacus library (PyTorch DP-SGD)
from opacus import PrivacyEngine

privacy_engine = PrivacyEngine()
model, optimizer, train_loader = privacy_engine.make_private_with_epsilon(
    module=model, optimizer=optimizer, data_loader=train_loader,
    epochs=10, target_epsilon=5.0, target_delta=1e-5, max_grad_norm=1.0,
)
```

#### Pseudonymization (≠ anonymization)

Replace identifiers with **artificial IDs** (hash, token, sequential ID).

| Property | Detail |
|---|---|
| Reversible if mapping kept | Yes |
| GDPR | Considered "personal data" still — pseudonymization ≠ full anonymization |
| Usage | Internal joins, hash-based bucketing |
| Risks | Original re-identifiable from quasi-IDs |

```python
import hashlib
def pseudonymize(email, salt):
    return hashlib.sha256((email + salt).encode()).hexdigest()
```

#### Aggregation / suppression rules

| Rule | Threshold |
|---|---|
| **Cell suppression** | Don't show counts < N (e.g., < 10) |
| **Top-coding** | Cap extreme values (`income > 500K → 500K+`) |
| **Bottom-coding** | Floor extreme values |
| **Random rounding** | Round to nearest 5 / 10 |

> US Census uses **DP** since 2020; previously used aggregation rules.

#### Synthetic data

Generate **fake but statistically similar** data:

| Method | Detail |
|---|---|
| **GANs** | Generative adversarial networks |
| **VAEs** | Variational autoencoders |
| **CTGAN / TVAE** | Tabular-specific |
| **DP-GAN** | GAN trained with DP-SGD |
| **Bayesian networks** | Sample from learned joint |

> Synthetic data **doesn't automatically preserve privacy** — model can memorize. Use **DP-trained generators**.

#### Use case → technique

| Use case | Technique |
|---|---|
| Internal join / engineering | Pseudonymization |
| Public release of microdata | k-anonymity + l-diversity (or t-closeness) |
| Statistical aggregates / dashboards | DP (Laplace / Gaussian) |
| ML training on private data | DP-SGD |
| Research data sharing | Synthetic data + DP |
| Cross-org collaboration | Federated learning + secure aggregation |
| Healthcare data | k-anonymity / l-diversity (HIPAA) |

#### GDPR / CCPA implications

| Regulation | Anonymization treatment |
|---|---|
| **GDPR** (EU) | Truly anonymized data is out of scope; pseudonymized is in scope |
| **CCPA** (California) | "De-identified" data: similar concept |
| **HIPAA** (US health) | Safe Harbor (18 specific identifier removals) or Expert Determination |
| **PIPEDA** (Canada) | Equivalent expectations |

> "Anonymized" must be **irreversible** under GDPR — pseudonymization with mapping kept is **still personal data**.

#### Re-identification risks

| Year | Famous case |
|---|---|
| 1997 | Sweeney re-identified MA governor's medical records via voter rolls |
| 2006 | AOL search-log release identified specific users |
| 2008 | Netflix Prize de-anonymized via IMDb ratings |
| 2014 | NYC taxi data — drivers and celebrities re-identified |
| 2018 | Strava heatmap revealed military bases |
| 2020 | Cellphone location data → re-identification at scale |

> Lesson: **datasets are far more identifiable than expected**. Test against re-identification with the **most plausible attacker**.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| "Removed names = anonymous" | Wrong; quasi-IDs identify |
| `k = 2` "anonymity" | Too low; use ≥ 5 typically |
| Static k-anonymity over many releases | Composition leaks |
| Synthetic data without DP guarantees | Models memorize; can leak |
| Conflating pseudonymization with anonymization | GDPR distinguishes |
| Aggregating to small cells | Suppress cells < N |
| Sharing model weights as anonymous | Models leak training data |
| Repeated DP queries without budget tracking | Composition exhausts budget |

#### Privacy-utility trade-off

Always present:

| Strategy | Privacy | Utility |
|---|---|---|
| Raw data | None | Maximum |
| Pseudonymization | Weak | High |
| k=5 anonymization | Medium | Medium-high |
| t-closeness | Strong | Medium |
| `(ε=10, δ=1e-5)`-DP | Strong | Medium-high |
| `(ε=1, δ=1e-5)`-DP | Very strong | Low-medium |
| Synthetic data + DP | Variable | Variable |

#### Code: k-anonymization

```python
def k_anonymize(df, qid_cols, k=5):
    """Generalize until each QID-equivalence class has ≥ k records."""
    df = df.copy()
    for col in qid_cols:
        if df.dtypes[col].kind in "if":  # numeric
            df[col] = pd.cut(df[col], bins=10, include_lowest=True)
        # else: categorical, generalize via taxonomy
    counts = df.groupby(qid_cols).size()
    keep = counts[counts >= k].index
    return df[df.set_index(qid_cols).index.isin(keep)]
```

> Production tools: **ARX (Java)**, **mu-argus**, **sdcMicro (R)**.

#### Decision tree

```
Releasing data?
├─ Internal use only          → Pseudonymization OK
├─ Cross-team / partner       → k-anonymity / l-diversity
├─ Public release             → t-closeness or DP
├─ Aggregate stats / dashboard → DP (Laplace / Gaussian)
├─ Training ML on private     → DP-SGD
├─ Synthetic clone            → DP-trained generator
└─ Cross-organization (no central) → Federated learning + DP
```

**Rule of thumb:** **anonymization is a spectrum, not a binary**. **Removing direct IDs is necessary but never sufficient** — quasi-IDs identify individuals. Use **k-anonymity** (k ≥ 5) + **l-diversity** as a baseline; **differential privacy** for stronger formal guarantees. **Pseudonymization is not anonymization** under GDPR. Always quantify **privacy-utility trade-off** explicitly. Test against **re-identification** with realistic adversary models.
