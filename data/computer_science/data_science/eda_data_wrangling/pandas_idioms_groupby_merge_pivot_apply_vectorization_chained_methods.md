### Pandas Idioms (groupby, merge, pivot, apply, vectorization, chained methods)

**When:** every data manipulation task in Python — cleaning, joining, aggregating, reshaping. Knowing the **idiomatic** patterns is the difference between code that runs in 1 second and 10 minutes.

#### Core operations cheatsheet

| Task | Idiom |
|---|---|
| Filter | `df[df["col"] > x]`, `df.query("col > x")` |
| Select columns | `df[["a", "b"]]`, `df.loc[:, "a":"c"]` |
| Apply / vectorize | Avoid `.apply()` for arithmetic; use vectorized ops |
| Aggregate | `df.groupby("g")["v"].agg(["mean", "sum", "count"])` |
| Pivot | `df.pivot_table(values, index, columns, aggfunc)` |
| Reshape long↔wide | `df.melt()`, `df.pivot()` |
| Merge | `df.merge(other, on="key", how="left")` |
| Concatenate | `pd.concat([df1, df2], axis=0/1)` |
| Sort | `df.sort_values(["a", "b"], ascending=[True, False])` |
| Rank | `df["v"].rank(method="dense")` |
| Top-K per group | `df.groupby("g").apply(lambda x: x.nlargest(3, "v"))` |
| Cumulative | `df["v"].cumsum()`, `.cumprod()`, `.cummax()` |
| Rolling | `df["v"].rolling(7).mean()` |
| Expanding | `df["v"].expanding().mean()` |
| Shift / diff | `df["v"].shift(1)`, `df["v"].diff(7)` |

#### Selection: `.loc` vs `.iloc` vs boolean

| Indexer | Type | Example |
|---|---|---|
| `.loc[]` | **Label-based** | `df.loc["2024-01", "revenue"]` |
| `.iloc[]` | **Position-based** | `df.iloc[0:5, [0, 2]]` |
| `[]` (bracket) | Column or boolean | `df["col"]`, `df[mask]` |
| `.at[]` / `.iat[]` | Single element (fastest) | `df.at[0, "col"]` |

> **Avoid chained indexing** (`df["a"]["b"]`) — undefined behavior re: views vs copies. Use `df.loc["a", "b"]`.

#### `groupby` patterns

```python
# Multiple aggregations, named outputs
df.groupby("region").agg(
    total_revenue=("revenue", "sum"),
    avg_revenue=("revenue", "mean"),
    n_customers=("customer_id", "nunique"),
)

# Multiple columns × multiple aggs
df.groupby("region").agg({"revenue": ["sum", "mean"], "users": "nunique"})

# Transform — broadcast back to original shape
df["share"] = df["revenue"] / df.groupby("region")["revenue"].transform("sum")

# Filter groups
df.groupby("region").filter(lambda x: x["revenue"].sum() > 10_000)

# Apply (slowest; use only when transform/agg insufficient)
df.groupby("region").apply(lambda g: g.nlargest(3, "revenue"))
```

> **`transform` returns same shape as original** — perfect for "share of group total" patterns.

#### Vectorization — the speed difference

| Pattern | Speed |
|---|---|
| **Vectorized** (`df["a"] + df["b"]`) | Fast (C-level NumPy) |
| `.apply()` row-wise | **10–100× slower** |
| `iterrows()` / `itertuples()` | **100–1000× slower** |
| Python list comprehension | Slower than vectorized |
| Numba / Cython | When vectorization isn't possible |

```python
# BAD: row-wise apply
df["total"] = df.apply(lambda row: row["price"] * row["qty"], axis=1)

# GOOD: vectorized
df["total"] = df["price"] * df["qty"]

# GOOD: np.where for conditionals
df["status"] = np.where(df["balance"] > 0, "active", "inactive")

# GOOD: np.select for multiple conditions
df["tier"] = np.select(
    [df["spend"] > 1000, df["spend"] > 100],
    ["gold", "silver"],
    default="bronze",
)
```

#### Joins / merges

```python
df.merge(other, on="user_id", how="left")        # left join
df.merge(other, left_on="a", right_on="b")        # different column names
df.merge(other, on="user_id", how="left", indicator=True)   # _merge column
```

| `how` | Result |
|---|---|
| `inner` | Both sides match |
| `left` | All from left, matching from right |
| `right` | All from right, matching from left |
| `outer` | Union — all rows from both |
| `cross` | Cartesian product |

> **Always inspect `_merge` indicator** when debugging unexpected row counts.

#### Pivot vs melt

```python
# Wide → long
long = df.melt(id_vars=["user_id"], var_name="metric", value_name="value")

# Long → wide
wide = long.pivot_table(index="user_id", columns="metric", values="value")

# Pivot with aggregation
df.pivot_table(values="revenue", index="region", columns="quarter", aggfunc="sum")
```

#### Time-series essentials

```python
df["date"] = pd.to_datetime(df["date"])
df = df.set_index("date").sort_index()

df.resample("D").sum()                            # daily aggregation
df.resample("W-MON").mean()                       # weekly, week starts Monday
df.rolling("7D").mean()                           # 7-day rolling
df.shift(7)                                       # lag by 7 periods

# Date components
df["dow"] = df.index.dayofweek
df["month"] = df.index.month
df["is_weekend"] = df.index.dayofweek >= 5
```

#### String operations (vectorized)

```python
df["name"].str.upper()
df["name"].str.contains("foo", case=False, na=False)
df["name"].str.extract(r"(\w+)@(\w+)")            # regex
df["email"].str.split("@", expand=True)
df["txt"].str.replace(r"\s+", " ", regex=True)
```

> **`.str` accessor is vectorized** — use it instead of `.apply(lambda x: x.upper())`.

#### Categorical dtype (memory + speed)

```python
df["region"] = df["region"].astype("category")
# Memory: 8 bytes per row → 1 byte per row (for low-cardinality)
# Sort / groupby: faster
```

> Convert low-cardinality string columns to `category` — massive memory savings.

#### Method chaining (clean pipelines)

```python
result = (df
    .query("status == 'active'")
    .assign(total=lambda d: d["price"] * d["qty"])
    .groupby("region")
    .agg(revenue=("total", "sum"))
    .sort_values("revenue", ascending=False)
    .head(10)
)
```

> Use `.assign()` instead of in-place mutation for chains. `pipe()` for custom functions.

#### Memory tricks

```python
# Read in chunks
for chunk in pd.read_csv("big.csv", chunksize=100_000):
    process(chunk)

# Specify dtypes upfront (avoids upcasting)
df = pd.read_csv("big.csv", dtype={"id": "int32", "region": "category"})

# Use parquet not CSV for production
df.to_parquet("data.parquet")            # faster read, smaller, preserves dtypes

# Reduce memory
df["int_col"] = pd.to_numeric(df["int_col"], downcast="integer")
df["float_col"] = pd.to_numeric(df["float_col"], downcast="float")

# Drop unused columns
df = df.drop(columns=["unused"])
```

#### Common pitfalls

| Mistake | Fix |
|---|---|
| `df.apply()` for arithmetic | Use vectorized operations |
| Chained `[][]` indexing | Use `.loc` / `.iloc` |
| `inplace=True` everywhere | Modern pandas style avoids it; chain instead |
| Treating `NaN` like `None` | `pd.isna()` not `==` |
| Joining on wrong key types | Cast both to same dtype |
| Forgetting reset_index after groupby | `.reset_index()` if you need the group cols back |
| `.copy()` vs view confusion | Set `pd.options.mode.chained_assignment = "raise"` to catch |
| Reading CSV without dtypes on huge files | Specify dtypes; use parquet |
| Datetime as string | `pd.to_datetime()` early |
| Forgetting `as_index=False` in groupby | Returns Series not DataFrame |

#### Common patterns / recipes

**Top-N per group:**

```python
df.sort_values(["group", "value"], ascending=[True, False]).groupby("group").head(3)
```

**Running rate / share of total per group:**

```python
df["share"] = df["value"] / df.groupby("group")["value"].transform("sum")
```

**Find rows where value increased over previous period:**

```python
df["prev"] = df.groupby("user")["value"].shift(1)
df["delta"] = df["value"] - df["prev"]
```

**Rolling 7-day average per group:**

```python
df = df.sort_values(["user", "date"])
df["rolling_7"] = df.groupby("user")["value"].rolling(7).mean().reset_index(level=0, drop=True)
```

**First / last value per group:**

```python
df.groupby("user")["timestamp"].first()
df.groupby("user")["timestamp"].last()
df.sort_values("timestamp").groupby("user").tail(1)        # last full row
```

**Pivot with formatting:**

```python
(df.pivot_table(values="revenue", index="region", columns="quarter", aggfunc="sum")
   .style.format("${:,.0f}"))
```

**Self-join (e.g., compare to previous record):**

```python
df_prev = df.assign(date=df["date"] + pd.Timedelta(days=1))
df.merge(df_prev, on=["user", "date"], suffixes=("", "_yesterday"))
```

#### Polars / DuckDB alternatives

For large data or speed-critical pipelines:

| Tool | When |
|---|---|
| **Polars** | 10–100× faster than pandas; multi-threaded; lazy eval |
| **DuckDB** | SQL on parquet / pandas; great for analytics |
| **Dask / Modin** | Distributed pandas-like API |
| **Vaex** | Out-of-core for huge data |

> If pandas is too slow on your data, Polars is the modern drop-in replacement.

**Rule of thumb:** **vectorize, don't iterate**. Use `.loc` / `.iloc`, never chained `[]`. **`groupby` + `transform`** for share-of-group; **`groupby` + `agg`** for summaries. Convert low-cardinality strings to **`category`** dtype. Use **parquet** for production data, **method chaining** for clean pipelines. When pandas runs out of room, reach for **Polars** or **DuckDB**.
