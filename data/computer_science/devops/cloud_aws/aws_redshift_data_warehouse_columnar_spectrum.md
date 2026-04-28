### AWS Redshift — Data Warehouse, Columnar, Spectrum

**Definition:** AWS's **fully managed petabyte-scale OLAP warehouse**. Postgres-compatible SQL, **columnar storage** with **MPP** (Massively Parallel Processing). Choose between **provisioned** (predictable cost) and **Serverless** (variable workloads). **Spectrum** queries S3 data directly without loading.

**Architecture (provisioned):**

```
   Client (BI tool / app)
        │
        │ SQL
        ▼
   ┌───────────────────────────┐
   │  Leader Node              │   parses, optimizes, distributes query
   └───────────┬───────────────┘
               │ (compiled query plan)
       ┌───────┴───────────────────────────┐
       ▼                  ▼                ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │Compute 1 │   │Compute 2 │   │Compute 3 │
   │(slices)  │   │(slices)  │   │(slices)  │
   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │              │              │
   [local SSD]    [local SSD]    [local SSD]
                                                ↑
   RA3 nodes also use S3 backing store via "Redshift Managed Storage"
```

| Component | Detail |
|---|---|
| **Leader node** | Receives queries, plans execution, aggregates results |
| **Compute nodes** | Each holds slices (subsets of data) |
| **Slice** | Unit of parallelism within a node |
| **Distribution** | How rows are spread across slices |
| **Sort key** | How rows are physically ordered on disk |
| **Compression encoding** | Per-column algorithm |

**Redshift vs RDS vs Athena:**

| Feature | **Redshift** | **RDS Postgres** | **Athena** |
|---|---|---|---|
| Purpose | Analytics (OLAP) | Transactions (OLTP) | Ad-hoc queries on S3 |
| Storage | Columnar | Row-based | S3 (external) |
| Scale | Petabytes | Terabytes | Unlimited (S3) |
| Query type | Complex aggregations | CRUD, joins | SQL on files |
| Pricing | Per node-hour | Per instance | Per TB scanned |
| Latency | Seconds | Sub-ms (OLTP) | Seconds-minutes |
| Best for | BI dashboards, reports | App database | Ad-hoc S3 exploration |

**Provisioned vs Serverless:**

| Property | **Provisioned** | **Serverless** |
|---|---|---|
| Compute model | Allocate cluster | Auto-scales |
| Pricing | Per node-hour | Per RPU-hour (pay for queries) |
| Predictable cost | Yes | Variable |
| Best for | Heavy steady workloads | Intermittent, variable |
| Setup | Choose node type + count | Just credentials |
| Pause / resume | Manual or scheduled | Auto pause when idle |

**Node types (provisioned):**

| Type | Class | Use |
|---|---|---|
| **RA3** | Compute + S3-backed storage (separate scaling) | Modern default |
| **DC2** | Local SSD, fixed storage | Smaller fixed datasets |

**Distribution styles:**

| Style | How | Use when |
|---|---|---|
| **KEY** | Rows with same key on same slice | Large tables joined frequently |
| **EVEN** | Round-robin across slices | No clear join key |
| **ALL** | Full copy on every slice | Small dimension tables |
| **AUTO** | Redshift decides | Default — usually best |

**Sort keys:**

| Type | Detail |
|---|---|
| **Compound** (default) | Rows sorted by listed columns in order |
| **Interleaved** | Equal weight to each sort key column (less common) |
| Common pick | `created_at` for time-series, frequently filtered columns |
| Win | Range-restricted scans skip irrelevant blocks |

**Compression encoding:**

| Encoding | Detail |
|---|---|
| **AZ64** | Modern; fastest for numeric / dates |
| **ZSTD** | High ratio, multi-purpose |
| **LZO** | Older default |
| **RUNLENGTH** | Sorted columns with low cardinality |
| **DELTA / DELTA32K** | Sorted numeric / dates |
| **AUTO** | Redshift picks (usually right) |

**Loading data — `COPY` is king:**

```sql
-- Bulk load from S3 (parallel, fast)
COPY orders FROM 's3://datalake/orders/'
IAM_ROLE 'arn:aws:iam::123:role/redshift-role'
FORMAT AS PARQUET;
```

| Best practice | Detail |
|---|---|
| **Use COPY** | Parallel; reads all S3 files |
| **Use Parquet / ORC** | Columnar formats are fastest |
| **Compress source files** | Smaller transfer |
| **Avoid INSERT row-by-row** | Very slow |
| **Use staging tables** | Bulk load → upsert pattern |
| **Manifest file** | Explicit list of files to load |
| **CSV → Parquet via Glue / EMR** | One-time conversion |

**Spectrum — query S3 without loading:**

```sql
-- Create external schema (one-time)
CREATE EXTERNAL SCHEMA spectrum_logs
FROM DATA CATALOG
DATABASE 'logs_db'
IAM_ROLE 'arn:aws:iam::123:role/spectrum-role';

-- Query S3 like any Redshift table
SELECT date, COUNT(*) FROM spectrum_logs.api_logs
WHERE date BETWEEN '2026-01-01' AND '2026-01-31'
GROUP BY date;

-- Combine S3 + Redshift in one query
SELECT u.name, COUNT(l.id)
FROM users u
JOIN spectrum_logs.api_logs l ON u.id = l.user_id
GROUP BY u.name;
```

| Property | Detail |
|---|---|
| Query S3 directly | No load step |
| Uses Glue Data Catalog | Schema discovery |
| Pricing | Per TB scanned |
| Combine with Redshift tables | Single query |
| Use case | Hot data in Redshift, cold in S3 (lake-house lite) |

**Performance optimizations:**

| Technique | Detail |
|---|---|
| Right distribution + sort keys | Avoids shuffles + scans |
| **VACUUM** + **ANALYZE** | Reclaim space, refresh stats |
| Materialized views | Pre-compute repeated aggregations |
| Result caching (auto) | Identical queries served from cache |
| WLM (Workload Management) | Concurrency queues, priorities |
| Concurrency Scaling | Add transient compute on bursts |
| Use compression | Less I/O |
| Avoid `SELECT *` on wide columnar | Select only needed columns |

**Workload Management (WLM):**

| Property | Detail |
|---|---|
| Define queues | E.g., ETL queue + reporting queue |
| Memory + concurrency per queue | Resource isolation |
| Auto-WLM | Redshift manages; usually fine |
| Manual-WLM | When you need strict isolation |
| Short-query acceleration | Bypass for fast queries |

**Backup / restore:**

| Feature | Detail |
|---|---|
| Automated snapshots | Daily, retained 1–35 days |
| Manual snapshots | Retained until deleted |
| Cross-region snapshot copy | DR |
| RA3 nodes back to S3 automatically | Built-in durability |

**Security:**

| Item | Detail |
|---|---|
| VPC-only | Recommend private subnet |
| IAM authentication | Or DB users + roles |
| Encryption at rest | KMS |
| Encryption in transit | TLS |
| Column-level encryption | Application-side |
| Row-level security | Via views + IAM |
| Audit logs | To S3 |

**Cost levers:**

| Lever | Detail |
|---|---|
| **Serverless for variable workloads** | Pay only for queries |
| **Pause provisioned cluster** | When not in use (overnight) |
| **Reserved instances** | Up to 75% off, 1-year/3-year |
| **Concurrency Scaling** | First few hours/day free |
| **Spectrum** for cold data | Cheaper than loading to Redshift |
| **Right-size** | Don't over-provision |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Wrong distribution key | Hot slices, slow joins |
| No sort key | Full table scan |
| `INSERT` per row | Painfully slow |
| Forgetting `VACUUM` after deletes | Wasted space |
| Forgetting `ANALYZE` | Bad query plans |
| Spectrum scan of huge unpartitioned data | $$$ scan cost |
| Wide column projection (`SELECT *`) | Defeats columnar benefit |
| Tiny files in S3 | Spectrum slow |
| Shared cluster for ETL + reports | Contention |
| Missing IAM role for COPY | Permission denied |

**Decision matrix:**

| Need | Pick |
|---|---|
| Heavy steady analytics | Provisioned RA3 |
| Variable / intermittent | Serverless |
| Just S3 ad-hoc | Athena (no cluster) |
| Mixed hot Redshift + cold S3 | Provisioned + Spectrum |
| Sub-second analytics | ClickHouse (alternative) |
| Lakehouse | Databricks / Iceberg |

**Cross-references:**

- Data warehouse / lake / lakehouse: [data_warehouse_lake_*.md](../../data_engineering/data_warehouse_lake_olap_star_schema_lakehouse.md)
- AWS Athena (S3 SQL): [aws_athena_*.md](aws_athena_glue_catalog_serverless_sql.md)
- ETL / ELT: [etl_*.md](../../data_engineering/etl_elt_pipeline_design_extraction_transformation_load.md)
- AWS Kinesis (streaming into Redshift): [aws_kinesis_*.md](aws_kinesis_data_streams_firehose_realtime_streaming.md)

**Rule of thumb:** **Redshift for heavy analytics on structured data**; **Serverless** for intermittent use; **Athena** for ad-hoc S3 queries (no cluster). Use **`COPY` from S3** to load (never `INSERT` row-by-row); prefer **Parquet/ORC**. Pick **distribution KEY on join columns**, **sort key on filter columns**. Use **Spectrum** to extend Redshift to cold S3 data.
