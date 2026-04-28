### Spark / PySpark (RDD, DataFrame, optimization, skew, broadcast, partitioning, Catalyst)

**When:** processing data that doesn't fit on a single machine (10s of GB → PB scale) — ETL, feature engineering, distributed model training data prep, log analytics. Spark is the **default big-data engine** for tabular workloads, with first-class Python (PySpark), SQL (Spark SQL), and ML (MLlib) APIs.

**Schema (the layered API):**

| API | Detail | Use |
|---|---|---|
| **RDD** (Resilient Distributed Dataset) | Low-level distributed collection of objects | Legacy; only when you need fine control |
| **DataFrame / Dataset** | Schema-aware, optimized via Catalyst | **Default** — almost always use |
| **Spark SQL** | SQL on DataFrames | Mixed-team workflows |
| **Structured Streaming** | DataFrames over streaming sources | Real-time pipelines |
| **MLlib** | Distributed ML | Pipeline-style training |
| **GraphFrames** | Graph algorithms on DataFrames | Niche |

> **Catalyst optimizer + Tungsten execution** make DataFrame much faster than RDD. Don't use RDD unless you have a specific reason.

#### Core API (PySpark)

```python
from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import IntegerType, StringType, StructType, StructField

spark = (SparkSession.builder
    .appName("analytics")
    .config("spark.sql.shuffle.partitions", "200")
    .config("spark.sql.adaptive.enabled", "true")
    .getOrCreate())

# Read
df = spark.read.parquet("s3://bucket/path")
df = spark.read.option("header", True).csv("file.csv")
df = spark.read.format("delta").load("s3://bucket/delta_table")

# Inspect
df.printSchema()
df.show(5)
df.count()                                   # triggers a job

# Transform (lazy)
result = (df
    .filter(F.col("status") == "active")
    .groupBy("region")
    .agg(F.sum("revenue").alias("total"),
         F.countDistinct("user_id").alias("users"))
    .orderBy(F.desc("total"))
)

# Action (triggers execution)
result.show()
result.write.parquet("s3://bucket/output", mode="overwrite")
```

#### Lazy evaluation

```
Transformations:  filter, select, groupBy, join, withColumn  → build DAG, no execution
Actions:           show, count, collect, write, take          → trigger execution
```

> Only **actions** trigger execution. Spark optimizes the entire DAG before running.

#### Catalyst optimizer

Spark's query planner:

| Stage | Detail |
|---|---|
| 1. Logical plan | What to compute |
| 2. Optimized logical plan | Push down filters, prune columns |
| 3. Physical plan | Choose specific operators (broadcast join vs shuffle join) |
| 4. Code generation | Compile to JVM bytecode (Tungsten) |

> Inspect with `df.explain()`. Look for predicate pushdown, broadcast joins, partition pruning.

#### Common operations

```python
# Select / project
df.select("user_id", "revenue", F.col("date").cast("date"))

# Filter
df.filter(F.col("revenue") > 100)

# Add column
df.withColumn("bucket", F.when(F.col("revenue") > 1000, "high").otherwise("low"))

# Aggregate
df.groupBy("region").agg(F.mean("revenue"), F.stddev("revenue"))

# Window functions
from pyspark.sql.window import Window
w = Window.partitionBy("user_id").orderBy("ts")
df.withColumn("prev_event", F.lag("event").over(w))
df.withColumn("rolling_avg", F.avg("amount").over(w.rowsBetween(-6, 0)))

# Join
df1.join(df2, on="user_id", how="left")

# Pivot
df.groupBy("user_id").pivot("metric_name").agg(F.first("value"))
```

#### Joins

| Type | Spark name | Use |
|---|---|---|
| Inner | `"inner"` (default) | Match both sides |
| Left outer | `"left"` / `"leftouter"` | All from left |
| Right outer | `"right"` | All from right |
| Full outer | `"outer"` / `"full"` | All from both |
| Left semi | `"leftsemi"` | Left rows that match (no right cols) |
| Left anti | `"leftanti"` | Left rows that DON'T match |
| Cross | `"cross"` | Cartesian product |

#### Broadcast join (key optimization)

When one side is **small** (fits in driver memory):

```python
from pyspark.sql.functions import broadcast
big.join(broadcast(small), on="key")
```

| Side | Limit |
|---|---|
| `spark.sql.autoBroadcastJoinThreshold` | Default 10 MB |
| Manual `broadcast()` hint | Up to ~1 GB |
| Above that | Use shuffle join or partition tables alike |

> **Broadcast joins are 10–100× faster** than shuffle joins for big-small joins. Always check if one side fits.

#### Shuffle (the expensive operation)

| Triggers shuffle | Detail |
|---|---|
| `groupBy` | Shuffles to colocate same key |
| `join` (without broadcast) | Shuffles both sides |
| `distinct` / `dropDuplicates` | Shuffles |
| `repartition(n)` | Forced shuffle |
| `orderBy` | Range partitioning |

| Avoids shuffle | Detail |
|---|---|
| `coalesce(n)` | Reduces partitions without shuffle (when going down) |
| `mapPartitions` | Stays within partition |
| `withColumn`, `select`, `filter` | Local |

#### Partition strategies

| Strategy | Detail |
|---|---|
| `df.repartition(n)` | Shuffle to `n` partitions |
| `df.repartition("key")` | Shuffle by key |
| `df.repartition(n, "key")` | Both |
| `df.coalesce(n)` | Reduce partitions; no shuffle |
| `df.write.partitionBy("date")` | Write to disk partitioned (for later filtering) |
| `df.write.bucketBy(N, "key")` | Bucketed writes for join optimization |

> **Default `spark.sql.shuffle.partitions = 200`**. For small data, lower (e.g., 8); for huge, raise (e.g., 1000). **Adaptive Query Execution (AQE)** auto-tunes since Spark 3.0.

#### Skew (the silent killer)

When one key has **disproportionately many rows**, that partition becomes the bottleneck:

| Symptom | Detail |
|---|---|
| One executor takes 10× longer than others | Skewed key in groupBy / join |
| Stage stuck at 199/200 tasks | Last task has all the skewed data |
| Driver OOM on collect | Too much data in one partition |

| Fix | Detail |
|---|---|
| **AQE skew handling** (Spark 3+) | Auto-splits skewed partitions; enable with `spark.sql.adaptive.skewJoin.enabled=true` |
| **Salting** | Add random suffix to skewed key on both sides; un-salt in result |
| **Two-stage aggregation** | First aggregate per (key, salt), then sum across salts |
| **Broadcast** | If one side is small enough |
| **Filter heavy keys separately** | Process them differently |

```python
# Salting example
N_SALTS = 100
df_salted = df.withColumn("salted_key",
    F.concat(F.col("key"), F.lit("_"), (F.rand() * N_SALTS).cast("int")))

# After group-by, un-salt
result = df_salted.groupBy("salted_key").agg(...).withColumn("key",
    F.split(F.col("salted_key"), "_").getItem(0))
```

#### File formats

| Format | Strength |
|---|---|
| **Parquet** | Columnar; predicate pushdown; **default for analytics** |
| **Delta Lake / Iceberg / Hudi** | Parquet + ACID transactions, time travel, schema evolution |
| **ORC** | Similar to Parquet; Hive-friendly |
| **CSV** | Avoid except for ingestion |
| **JSON** | Avoid except for ingestion |
| **Avro** | Row-oriented; streaming pipelines |

> **Always Parquet (or Delta) for analytics**. CSV is 10–100× slower.

#### Optimization checklist

| Optimization | Effect |
|---|---|
| Use Parquet, not CSV | 10× faster reads |
| Push filter down (Spark does automatically) | Skips reading unfiltered partitions |
| Select only needed columns | Column pruning |
| Broadcast small side of joins | Avoids shuffle |
| Cache/persist DataFrames reused multiple times | Avoids recomputation |
| Use Catalyst-friendly ops (DataFrame, not UDF) | Tungsten code-gen |
| Avoid `collect()` on big data | OOM driver |
| Set `spark.sql.shuffle.partitions` appropriately | Per data scale |
| Enable AQE (Spark 3+) | Auto-tunes shuffle partitions, skew |
| Partition tables on disk by frequently-filtered column | Partition pruning |
| Avoid Python UDFs (slow) | Use built-in F.* functions or Pandas UDFs |

#### UDFs (user-defined functions)

| Type | Speed |
|---|---|
| **Built-in `F.*` functions** | Fastest (Catalyst optimization) |
| **Pandas UDF / `mapInPandas`** | Vectorized; 10–100× faster than Python UDF |
| **Python UDF** | **Avoid** — slow (row-by-row Python ↔ JVM serialization) |
| **SQL UDF** | Same as built-in |

```python
# Pandas UDF (fast)
from pyspark.sql.functions import pandas_udf
import pandas as pd

@pandas_udf("double")
def square(x: pd.Series) -> pd.Series:
    return x ** 2

df.withColumn("squared", square("value"))
```

#### Caching / persisting

```python
df_filtered = df.filter(...).cache()
df_filtered.count()              # materialize cache
# Use df_filtered multiple times — fast now
```

| Storage level | Detail |
|---|---|
| `MEMORY_ONLY` | Default for `cache()`; lost if low memory |
| `MEMORY_AND_DISK` | Default for `persist()`; spills to disk |
| `DISK_ONLY` | When data won't fit in memory |
| `MEMORY_ONLY_SER` | Serialized; lower memory, more CPU |

> Cache only if **reused multiple times**. Premature caching wastes memory.

#### Spark MLlib (briefly)

```python
from pyspark.ml import Pipeline
from pyspark.ml.feature import VectorAssembler, StandardScaler
from pyspark.ml.classification import LogisticRegression

pipeline = Pipeline(stages=[
    VectorAssembler(inputCols=["a", "b", "c"], outputCol="raw"),
    StandardScaler(inputCol="raw", outputCol="features"),
    LogisticRegression(featuresCol="features", labelCol="y"),
])
model = pipeline.fit(df_train)
predictions = model.transform(df_test)
```

> MLlib is **distributed-first** but slower for small data than scikit-learn / XGBoost. For huge data, no alternative.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| `collect()` on huge DataFrame | OOM driver; aggregate first |
| Python UDF on big data | Use `F.*` or pandas_udf |
| Shuffle partitions = 200 for tiny data | Set lower; AQE helps |
| Joins with skew, no AQE | Enable adaptive; or salt |
| CSV instead of Parquet | 10× slower; switch |
| Caching everything | Wastes memory; cache only reused |
| Default 1g executor memory | Set explicitly; profile |
| Not using `broadcast()` for small dim tables | Big speedup missed |
| Misordered withColumns | Write multiple `select` to allow optimizer to combine |
| Driver OOM from logging | Spark logs are huge; aggregate before logging |

#### Cluster sizing

| Workload | Sizing |
|---|---|
| Daily ETL | Smaller cluster, scheduled |
| Interactive analytics | Larger driver, autoscaling executors |
| ML training | GPU nodes if applicable |
| Streaming | Stable size, low latency tuning |

#### Spark vs alternatives

| Need | Use |
|---|---|
| Petabyte-scale tabular | **Spark** / Trino / Presto |
| < 100 GB tabular | **Polars / DuckDB** (often faster than Spark on a single machine) |
| Streaming | Flink (lower latency) or Spark Structured Streaming |
| Interactive SQL on warehouse | **BigQuery / Snowflake / Redshift** |
| Custom Python on big data | **Dask** (Python-native) or PySpark |
| Graph algorithms | GraphFrames / GraphX (Spark) or Neo4j |

#### Version notes (modern features)

| Feature | Spark version |
|---|---|
| Adaptive Query Execution | 3.0+ |
| Dynamic partition pruning | 3.0+ |
| Pandas UDF (vectorized) | 2.3+ |
| `applyInPandas` (grouped pandas UDF) | 3.0+ |
| Photon engine (Databricks) | DBR 9+ |

#### Decision tree

```
Data size?
├─ < 10 GB                          → Polars / DuckDB / pandas
├─ 10 GB – 1 TB
│   ├─ One-time analysis             → DuckDB or Spark
│   └─ Production pipeline           → Spark / Databricks
└─ > 1 TB                            → Spark / Snowflake / BigQuery

Need real-time?
├─ Sub-second latency                → Flink
└─ Seconds–minutes                   → Spark Structured Streaming

Need ML at scale?
├─ Tabular, on-prem                  → Spark MLlib
├─ Deep learning                      → Distributed PyTorch / Ray
└─ Cloud-managed                     → Vertex AI / SageMaker / Databricks ML
```

**Rule of thumb:** **DataFrame API + Catalyst, not RDD**. Use **Parquet / Delta**, not CSV. **Broadcast small sides of joins**; **enable AQE** for skew handling. **Avoid Python UDFs** — use `F.*` or `pandas_udf`. Don't use Spark for data that fits on one machine — **Polars / DuckDB are 10× faster** there. Spark's wins are at the **TB+ scale**.
