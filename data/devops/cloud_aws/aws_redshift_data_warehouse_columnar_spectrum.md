### AWS Redshift (Data Warehouse)

**What Redshift does:**
- Fully managed cloud data warehouse
- Columnar storage + MPP (Massively Parallel Processing)
- Optimized for OLAP (analytical queries on large datasets)
- SQL-compatible (PostgreSQL-based)

**Architecture:**
```
[Leader Node] — parses queries, builds execution plan
      |
[Compute Node 1] [Compute Node 2] [Compute Node 3]
   (slices)          (slices)          (slices)
      |                 |                 |
   [local disk]     [local disk]     [local disk]
```

**Redshift vs RDS vs Athena:**
| Feature | Redshift | RDS (PostgreSQL) | Athena |
|---------|----------|------------------|--------|
| Purpose | Analytics (OLAP) | Transactions (OLTP) | Ad-hoc queries on S3 |
| Storage | Columnar | Row-based | S3 (external) |
| Scale | Petabytes | Terabytes | Unlimited (S3) |
| Query type | Complex aggregations | CRUD, joins | SQL on files |
| Pricing | Per node (hourly) | Per instance | Per TB scanned |
| Best for | BI dashboards, reports | Application database | Ad-hoc exploration |

**Redshift Serverless:**
- No cluster management (auto-scales)
- Pay for compute only when running queries
- Good for: intermittent analytics, variable workloads
- Provisioned: better for predictable, heavy workloads

**Redshift Spectrum:**
- Query S3 data directly from Redshift (without loading)
- Uses Glue Data Catalog for schema
- Combine: warehouse data (Redshift tables) + lake data (S3) in one query

**Distribution styles:**
| Style | How | Use when |
|-------|-----|----------|
| KEY | Rows with same key on same node | Large tables joined frequently (join key) |
| EVEN | Round-robin across nodes | No clear join key |
| ALL | Full copy on every node | Small dimension tables |
| AUTO | Redshift decides | Default (usually best) |

**Sort keys:**
- Data physically sorted on disk by sort key
- Range-restricted scans: skip irrelevant blocks
- Common: `created_at` (time-series), frequently filtered columns

**Loading data:**
```sql
-- COPY from S3 (fastest bulk load)
COPY orders FROM 's3://datalake/orders/'
IAM_ROLE 'arn:aws:iam::123:role/redshift-role'
FORMAT AS PARQUET;
```
- COPY is parallel (reads from multiple S3 files simultaneously)
- Use Parquet/ORC for fastest loads
- Avoid INSERT one-by-one (very slow)

**Rule of thumb:** Redshift for heavy analytics/BI on structured data. Redshift Serverless for intermittent use. Athena for ad-hoc S3 queries (no cluster needed). Use COPY from S3 for loading (not INSERT). Distribution KEY on join columns, sort key on filter columns.
