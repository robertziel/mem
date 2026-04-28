### Data Warehouse, Lake, Lakehouse — OLAP, Star Schema

**Definition:** three storage paradigms for analytics. **Data warehouse** = structured, schema-on-write, OLAP-optimized (Snowflake, BigQuery, Redshift). **Data lake** = raw + cheap (S3, GCS), schema-on-read. **Lakehouse** = lake's economics + warehouse's ACID via metadata layer (Delta Lake, Iceberg, Hudi).

**Three paradigms — at a glance:**

| Property | **Warehouse** | **Lake** | **Lakehouse** |
|---|---|---|---|
| Data format | Structured | Any | Any (with schema metadata) |
| Schema | On write | On read | On write + read |
| Storage cost | Higher | Cheapest | Cheap |
| Query performance | Fastest | Slower | Fast |
| ACID transactions | ✅ | ❌ | ✅ |
| Best for | BI, dashboards | Raw data, ML | Both |
| Examples | Snowflake, BigQuery, Redshift, ClickHouse | S3 + Athena, HDFS + Spark | Delta Lake, Iceberg, Hudi |

**OLTP vs OLAP — different optimizations:**

| Property | **OLTP** | **OLAP** |
|---|---|---|
| Purpose | Operational transactions | Analytical queries |
| Queries | Short, simple (CRUD) | Complex (aggregations, joins) |
| Volume per query | Few rows | Many rows |
| Updates | Frequent | Bulk loads |
| Schema | Normalized (3NF) | Denormalized (star/snowflake) |
| Storage | Row-oriented | **Column-oriented** |
| Latency | < 1 ms typical | Seconds to minutes OK |
| Examples | Postgres, MySQL | Snowflake, BigQuery, Redshift |

**Why columnar storage is faster for OLAP:**

```
   SELECT SUM(amount) FROM orders WHERE region = 'EU';

   Row-oriented:
     [id1,date1,region1,amount1,...]  ← all columns of row 1
     [id2,date2,region2,amount2,...]  ← row 2
     ...
     Reads ALL columns even though only region + amount needed.

   Columnar:
     id:      [id1, id2, id3, ...]
     date:    [date1, date2, ...]
     region:  [region1, region2, ...]   ← read only this column
     amount:  [amount1, amount2, ...]    ← and this
     Skip what you don't need; massive compression.
```

**Star schema — warehouse modeling:**

```
            ┌─────────────┐
            │  dim_date   │
            └──────┬──────┘
                   │
   ┌─────────┐    │     ┌─────────────┐
   │ dim_user │ ──┼──── │ dim_product │
   └─────────┘    │     └─────────────┘
                  │
            ┌─────▼──────┐
            │ fact_orders │   (large; growing)
            │  user_id   │
            │  product_id │
            │  date_id   │
            │  store_id  │
            │  amount    │
            └──────┬─────┘
                   │
            ┌──────▼──────┐
            │  dim_store  │
            └─────────────┘
```

| Table type | Detail |
|---|---|
| **Fact table** | Events / transactions (orders, clicks); large, append-heavy |
| **Dimension table** | Descriptive attributes (user, product, date); small, slow-changing |
| Foreign keys | Fact references dimensions |
| Star vs Snowflake | Snowflake normalizes dimensions further |

**Snowflake schema — normalized dimensions:**

```
dim_product → dim_category → dim_supplier
       ↓
   fact_orders
       ↑
dim_date → dim_quarter → dim_year
```

| Trade-off | Detail |
|---|---|
| Star: simpler joins | Pre-join logic in dimension tables |
| Snowflake: less redundancy | More joins required |
| Most warehouses use star | Performance > storage |

**Data modeling layers (medallion):**

| Layer | Detail |
|---|---|
| **Raw / Bronze** | Exact copy of source data (append-only) |
| **Staging / Silver** | Cleaned, deduplicated, type-cast, joined to dimensions |
| **Marts / Gold** | Business-ready aggregations + models |
| Tools | dbt is the standard for SQL-based modeling |

**Slowly Changing Dimensions (SCD):**

| Type | Behavior | History |
|---|---|---|
| **SCD Type 1** | Overwrite old value | None |
| **SCD Type 2** | Add new row with version + valid date range | Full history (most common) |
| **SCD Type 3** | Add `previous_value` column | Limited (one prior) |
| **SCD Type 4** | Separate history table | Full, off main |
| **SCD Type 6** | Combination (1+2+3) | Comprehensive |

**Cloud warehouse features (modern):**

| Feature | Detail |
|---|---|
| **Separation of storage and compute** | Scale independently (Snowflake, BigQuery, Databricks) |
| **Columnar storage** | Compression + selective reads |
| **MPP** (Massively Parallel Processing) | Query distributed across nodes |
| **Auto-scaling compute** | Resize on demand |
| **Time travel** | Query data as of past timestamp |
| **Zero-copy clones** | Branch a database for testing |
| **Streaming ingestion** | Snowpipe, BigQuery streaming |
| **Serverless option** | Pay-per-query (BigQuery, Athena, Snowflake serverless) |

**Lakehouse architecture:**

```
   ┌─────────────────────────────────────┐
   │  Compute (Spark, Trino, Flink)       │
   └────────────────┬────────────────────┘
                    │
   ┌────────────────▼────────────────────┐
   │  Metadata layer (Delta / Iceberg /   │
   │  Hudi) — schema, transactions, time  │
   │  travel                              │
   └────────────────┬────────────────────┘
                    │
   ┌────────────────▼────────────────────┐
   │  Cheap object storage (S3 / GCS)     │
   │  Parquet files                       │
   └─────────────────────────────────────┘
```

**Lakehouse formats:**

| Format | Origin | Detail |
|---|---|---|
| **Delta Lake** | Databricks | Transaction log via JSON files |
| **Apache Iceberg** | Netflix | Snapshot-based, multi-engine |
| **Apache Hudi** | Uber | Optimized for upserts |
| All three | Open formats | ACID, time travel, schema evolution |

**File formats — comparison:**

| Format | Type | Use |
|---|---|---|
| **CSV** | Row, plaintext | Interchange, readable |
| **JSON** | Row, semi-structured | APIs, logs |
| **Avro** | Row, binary | Streaming (Kafka) |
| **Parquet** | **Columnar**, binary | Analytics — default |
| **ORC** | Columnar | Hive ecosystem |
| **Arrow** | Columnar in-memory | Fast query engine interchange |

**Tools and where they fit:**

| Tool | Type | Use |
|---|---|---|
| **Snowflake** | Cloud warehouse | Easy, managed |
| **BigQuery** | Cloud warehouse | GCP, serverless |
| **Redshift** | Cloud warehouse | AWS-native |
| **ClickHouse** | OSS columnar warehouse | Sub-second analytics |
| **Databricks** | Lakehouse | Lakehouse + ML |
| **Athena / Trino** | Query engine on lake | Ad-hoc S3 queries |
| **dbt** | SQL transformation | Modeling layers |
| **Airflow / Dagster** | Orchestration | Pipeline DAG |
| **Spark** | Distributed compute | Large transformations, ML |

**ETL vs ELT:**

| Pattern | Order | Modern? |
|---|---|---|
| **ETL** | Extract → Transform → Load | Pre-cloud era |
| **ELT** | Extract → Load → Transform | Cloud-first; transform in warehouse |
| **Reverse ETL** | Warehouse → operational systems | Business workflows from warehouse |

**Performance optimizations:**

| Technique | Detail |
|---|---|
| **Partitioning** | Split table by date / region (skip irrelevant) |
| **Clustering / sort keys** | Physical ordering on disk |
| **Materialized views** | Pre-computed aggregations |
| **Result caching** | Cache identical queries |
| **Aggregate tables** | Hand-rolled rollups |
| **Compression** | Columnar enables high ratios |
| **Bloom filters** | Skip blocks without matching values |
| **Z-order** (Delta) | Multi-dim clustering |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Lake without governance | Becomes data swamp |
| OLTP DB used for analytics | Slow, locks contention |
| Heavy joins in fact-table queries | Slow; denormalize |
| No partitioning on time-series tables | Full scans |
| Schema drift in lake | Queries break unexpectedly |
| Treating warehouse as OLTP | Wrong shape |
| Skipping medallion layers | Spaghetti dependencies |
| No SCD strategy | Lost history |
| Loading per-row to warehouse | Use bulk load (COPY) |
| Forgetting timezone handling | Aggregate bugs |

**Decision matrix:**

| Need | Pick |
|---|---|
| BI dashboards on cleaned data | Cloud warehouse (Snowflake, BigQuery, Redshift) |
| Raw data + ML | Data lake (S3 + Athena/Spark) |
| Both BI + ML on same data | Lakehouse (Databricks, Delta, Iceberg) |
| Sub-second OLAP queries | ClickHouse |
| Massive batch transforms | Spark |
| Daily SQL modeling | dbt + warehouse |
| Streaming analytics | Kafka + Flink / Materialize |

**Cross-references:**

- AWS Redshift specifics: [aws_redshift_*.md](../devops/cloud_aws/aws_redshift_data_warehouse_columnar_spectrum.md)
- ETL/ELT pipelines: [etl_*.md](etl_elt_pipeline_design_extraction_transformation_load.md)
- Kafka + streaming: [kafka_*.md](kafka_event_streaming_topic_partition_offset.md)
- CDC / outbox: [cdc_*.md](cdc_debezium_change_data_capture_wal_outbox.md)

**Rule of thumb:** **Cloud warehouse for analytics + BI** (Snowflake, BigQuery, Redshift). **Data lake for raw data + ML** (S3 + Athena/Spark). **Lakehouse if you need both** on the same data (Databricks/Delta, Iceberg). **Model in layers**: raw (bronze) → staging (silver) → marts (gold) using **dbt**. **Star schema** for BI reporting; **columnar storage** is what makes OLAP fast.
