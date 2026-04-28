### Datetime + Text Feature Engineering (cyclical encoding, TF-IDF, n-grams, hashing, calendar)

**When:** unstructured raw fields — timestamps, free text, JSON blobs, URLs — must become numeric features for ML. The encoding pattern depends on **whether the feature is cyclical, hierarchical, or unstructured**.

## Datetime features

#### Direct extraction

```python
df["year"]    = df["ts"].dt.year
df["month"]   = df["ts"].dt.month
df["day"]     = df["ts"].dt.day
df["hour"]    = df["ts"].dt.hour
df["minute"]  = df["ts"].dt.minute
df["dow"]     = df["ts"].dt.dayofweek                # 0 = Monday
df["doy"]     = df["ts"].dt.dayofyear
df["week"]    = df["ts"].dt.isocalendar().week
df["quarter"] = df["ts"].dt.quarter
df["is_weekend"] = (df["ts"].dt.dayofweek >= 5).astype(int)
df["is_month_start"] = df["ts"].dt.is_month_start.astype(int)
df["is_month_end"]   = df["ts"].dt.is_month_end.astype(int)
```

#### Cyclical encoding (the critical trick)

Hour-of-day, day-of-week, month, day-of-year all **wrap around** — hour 23 is next to hour 0. Integer encoding makes them far apart.

```python
import numpy as np

def cyclical(values, period):
    return (np.sin(2 * np.pi * values / period),
            np.cos(2 * np.pi * values / period))

df["hour_sin"], df["hour_cos"] = cyclical(df["hour"], 24)
df["dow_sin"],  df["dow_cos"]  = cyclical(df["dow"], 7)
df["month_sin"], df["month_cos"] = cyclical(df["month"], 12)
df["doy_sin"],  df["doy_cos"]  = cyclical(df["doy"], 365.25)
```

> **Sin / cos pair** preserves the circular distance. Standard for any periodic feature.

#### Time-since features

```python
ref = pd.Timestamp("2024-01-01")
df["days_since_signup"] = (df["ts"] - df["signup_ts"]).dt.days
df["days_until_event"]  = (df["event_ts"] - df["ts"]).dt.days
df["seconds_since_last_action"] = df.groupby("user")["ts"].diff().dt.total_seconds()
```

#### Holiday / business calendar

```python
import holidays
us_holidays = holidays.US(years=range(2020, 2026))
df["is_holiday"] = df["ts"].dt.date.isin(us_holidays).astype(int)

# Business days
import pandas as pd
df["is_business_day"] = pd.bdate_range(start="2020-01-01", end="2025-12-31").isin(df["ts"]).astype(int)
```

| Feature | Why |
|---|---|
| Is holiday | Sales / traffic spike or drop |
| Days to next holiday | Anticipation effect |
| Days from last holiday | Recovery / lag effect |
| Business days only | For workday-only metrics |
| Pay-day proximity | E-commerce |

#### Lag and rolling features (for time series)

```python
df = df.sort_values(["user_id", "ts"])
df["lag_1"]  = df.groupby("user_id")["metric"].shift(1)
df["lag_7"]  = df.groupby("user_id")["metric"].shift(7)
df["rolling_mean_7"] = df.groupby("user_id")["metric"].transform(
    lambda x: x.shift(1).rolling(7).mean()
)
```

> **Always shift before rolling** to prevent leakage from current row.

#### Datetime feature picker

| Goal | Features |
|---|---|
| Hourly traffic | hour_sin, hour_cos, dow_sin, dow_cos, is_weekend |
| Daily sales | day, month_sin/cos, is_holiday, is_payday |
| Long-horizon trend | year, month, year-quarter |
| User behavior | days_since_signup, sessions_in_last_7d, recency_seconds |
| Product seasonality | month_sin/cos, is_holiday, days_to_next_holiday |

## Text features

#### Bag of Words (BoW)

```python
from sklearn.feature_extraction.text import CountVectorizer
cv = CountVectorizer(min_df=5, max_df=0.95, ngram_range=(1, 2))
X = cv.fit_transform(df["text"])
```

| Parameter | Effect |
|---|---|
| `min_df` | Drop terms appearing in < N docs |
| `max_df` | Drop overly common terms |
| `ngram_range=(1, 2)` | Unigrams + bigrams |
| `binary=True` | Indicator instead of count |

#### TF-IDF

`TF-IDF(t, d) = TF(t, d) · log(N / DF(t))`

```python
from sklearn.feature_extraction.text import TfidfVectorizer
tfidf = TfidfVectorizer(min_df=5, max_df=0.95, ngram_range=(1, 2), sublinear_tf=True)
X = tfidf.fit_transform(df["text"])
```

| Parameter | Effect |
|---|---|
| `sublinear_tf=True` | `1 + log(TF)` — flattens frequent-term dominance |
| `norm="l2"` | L2-normalize each row (cosine ready) |
| `stop_words="english"` | Remove common stop words |
| `lowercase=True` | Default; canonicalize |

> **TF-IDF is the strong baseline** — beats raw counts in almost every text-classification task.

#### Hashing trick (for text at scale)

```python
from sklearn.feature_extraction.text import HashingVectorizer
hv = HashingVectorizer(n_features=2**18, alternate_sign=False)
X = hv.transform(df["text"])
```

| Use when | Why |
|---|---|
| Out-of-core / streaming | No vocabulary needed |
| Very large vocabularies | Memory bounded |
| Online learning | Stateless |

#### Word embeddings

| Embedding | Source | Dim |
|---|---|---|
| **Word2Vec** | Trained on local windows | 100–300 |
| **GloVe** | Co-occurrence matrix factorization | 50–300 |
| **FastText** | Subword n-grams; handles OOV | 100–300 |
| **Sentence-BERT** | Pre-trained transformer | 384–768 |
| **OpenAI / Cohere embeddings** | API; very high quality | 1536+ |

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(df["text"].tolist())
```

> Modern default: **Sentence-BERT** for semantic similarity, **TF-IDF** for keyword-matching tasks (often equally good for classification, much faster).

#### Text engineering features (beyond vectors)

| Feature | Compute |
|---|---|
| Length (chars, words, sentences) | `len(text.split())` |
| Average word length | `np.mean([len(w) for w in text.split()])` |
| Punctuation count | `sum(c in punctuation for c in text)` |
| Uppercase ratio | `sum(c.isupper() for c in text) / len(text)` |
| Number / digit count | regex |
| URL / email / mention presence | regex |
| Sentiment score | VADER / TextBlob / transformer |
| Language detection | `langdetect` |
| Readability (Flesch) | `textstat` |
| POS tag distribution | spaCy |

#### Text cleaning checklist

```python
import re
def clean(text):
    text = text.lower()
    text = re.sub(r"http\S+", " URL ", text)
    text = re.sub(r"@\w+", " MENTION ", text)
    text = re.sub(r"#\w+", " HASHTAG ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
```

| Cleaning step | When |
|---|---|
| Lowercase | Almost always |
| Remove URLs / mentions / emojis | Tweet-style data |
| Strip HTML | Web scrapes |
| Replace numbers with `<NUM>` | Reduce vocab |
| Remove stop words | TF-IDF / BoW (not for embeddings) |
| Stemming / lemmatization | Sometimes; modern embeddings handle inflection natively |
| Spell correction | Noisy text |

#### URLs / paths

```python
from urllib.parse import urlparse
df["domain"] = df["url"].apply(lambda u: urlparse(u).netloc)
df["path_depth"] = df["url"].apply(lambda u: urlparse(u).path.count("/"))
df["has_query"] = df["url"].apply(lambda u: bool(urlparse(u).query)).astype(int)
df["tld"] = df["domain"].apply(lambda d: d.rsplit(".", 1)[-1])
```

#### JSON / nested

```python
df_flat = pd.json_normalize(df["json_blob"])           # flatten nested keys
```

> Then encode each flattened column normally.

#### Decision tree (encoding choice)

```
Datetime feature?
├─ Cyclical (hour, dow, month)         → sin / cos pair
├─ Linear / monotonic (years since)     → keep numeric
├─ Discrete category (is_holiday)       → 0/1
└─ Lag / window for time series        → shift + rolling

Text feature?
├─ Linear classifier baseline           → TF-IDF + bigrams
├─ Many docs, online learning           → Hashing
├─ Semantic similarity / clustering     → Sentence-BERT
├─ Multilingual                         → mBERT / XLM-R
└─ Cheap signal                         → Length + sentiment + counts

URL / path?
└─ Parse → domain, path, params, TLD as separate features

JSON?
└─ json_normalize → encode flat columns
```

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Integer encoding for cyclical | Use sin / cos |
| Forgetting to shift before rolling | Leakage from current period |
| Fitting TF-IDF on full corpus before split | Vocabulary leak; fit on train only |
| Stop words removed for embeddings | Sentence-BERT wants raw |
| `dt.weekday` in some libs (1-indexed Monday) vs `dt.dayofweek` | Pandas uses 0=Mon |
| Timezone-naive on global data | Localize early; standardize tz |
| Treating timestamps as strings | Convert with `pd.to_datetime` first |
| Free-text in production with new vocab | Use hashing for OOV robustness |
| Cleaning too aggressively for transformers | They handle messy text fine |

#### Pipeline integration

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer

preproc = ColumnTransformer([
    ("text", TfidfVectorizer(min_df=5, ngram_range=(1, 2)), "review_text"),
    ("num", "passthrough", ["price", "rating"]),
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["category"]),
])
```

#### Datetime + text combined

```python
df["text_clean"] = df["text"].apply(clean)
df["text_length"] = df["text"].str.len()
df["hour_sin"] = np.sin(2 * np.pi * df["ts"].dt.hour / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["ts"].dt.hour / 24)
# Then transform: TF-IDF on text_clean + numeric on rest
```

**Rule of thumb:** **datetime → cyclical sin/cos for periodic, time-since for monotonic, holiday flags for calendar effects, lag/rolling for time series**. **Text → TF-IDF + bigrams** as the strong baseline; **Sentence-BERT** for semantic tasks; **hashing** for streaming. Always **shift before rolling** features. Always **fit text vectorizers on train only** and inside a `Pipeline`.
