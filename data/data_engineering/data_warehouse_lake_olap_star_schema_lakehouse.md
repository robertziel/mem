### Data Warehouse, Data Lake, and Lakehouse

**Data Warehouse:**
- Structured, schema-on-write
- Optimized for analytical queries (OLAP)
- Columnar storage (fast aggregations)
- SQL-based querying
- Examples: Snowflake, BigQuery, Redshift, ClickHouse

**Data Lake:**
- Raw data in any format (structured, semi-structured, unstructured)
- Schema-on-read (apply schema when querying)
- Cheap storage (S3, GCS, ADLS)
- Risk of becoming a "data swamp" without governance
- Examples: S3 + Athena, HDFS + Spark

**Data Lakehouse:**
- Combines lake (cheap storage) with warehouse (ACID, schema, performance)
- Open file formats with metadata layer
- Examples: Databricks (Delta Lake), Apache Iceberg, Apache Hudi

**Comparison:**
| Feature | Warehouse | Lake | Lakehouse |
|---------|-----------|------|-----------|
| Data format | Structured | Any | Any |
| Schema | On write | On read | On write + read |
| Storage cost | Higher | Cheapest | Cheap |
| Query performance | Fastest | Slower | Fast |
| ACID transactions | Yes | No | Yes |
| Best for | BI, analytics | ML, raw storage | Both |

**OLTP vs OLAP:**
| Feature | OLTP | OLAP |
|---------|------|------|
| Purpose | Operational transactions | Analytical queries |
| Queries | Short, simple (CRUD) | Complex (aggregations, joins) |
| Data | Current state | Historical |
| Schema | Normalized (3NF) | Denormalized (star/snowflake) |
| Example | PostgreSQL, MySQL | Snowflake, BigQuery, Redshift |

**Star schema (warehouse modeling):**
```
          [dim_date]
              |
[dim_user] - [fact_orders] - [dim_product]
              |
          [dim_store]
```
- **Fact table** - events/transactions (orders, clicks, payments) - large, grows fast
- **Dimension table** - descriptive attributes (user, product, date, location) - small, slowly changing

**Data modeling layers:**
```
Raw (Bronze)     -> exact copy of source data
Staging (Silver) -> cleaned, deduplicated, typed
Marts (Gold)     -> business-ready aggregations and models
```

**Slowly Changing Dimensions (SCD):**
- **Type 1** - overwrite old value (no history)
- **Type 2** - add new row with version/date range (full history, most common)
- **Type 3** - add column for previous value (limited history)

**Key cloud warehouse features:**
- **Separation of storage and compute** - scale independently
- **Columnar storage** - compress and read only needed columns
- **MPP (Massively Parallel Processing)** - distribute query across nodes
- **Auto-scaling** - resize compute on demand
- **Time travel** - query data as of a past timestamp

**Rule of thumb:** Use a cloud warehouse (Snowflake, BigQuery) for analytics. Use a data lake (S3) for raw data and ML. Model in layers (raw -> staging -> marts). Star schema for BI reporting. Lakehouse if you need both analytics and ML on the same data.
