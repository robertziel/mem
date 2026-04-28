### ETL / ELT Pipelines (Airflow, dbt, CDC, Data Quality)

**ETL vs ELT — same pieces, different order:**

| | **ETL** | **ELT** |
|---|---|---|
| Order | Extract → **Transform** → Load | Extract → Load → **Transform** (in warehouse) |
| Transform location | Staging area / pipeline | Inside the warehouse |
| Why historically | Warehouses too small / slow to do all the work | — |
| Why now | Legacy / specialized transforms (PII redaction in flight) | Cloud warehouses are elastic + cheap |
| Tools | Airflow + Spark / Beam, Talend, custom | Fivetran/Airbyte (EL) + **dbt** (T) |
| Schema | Fixed before load | Raw preserved; transformed later |
| Default for new builds | — | **ELT** |

**Layered modeling (medallion / raw → staging → marts):**

| Layer | Contents | Owner |
|---|---|---|
| **Raw / bronze** | Untouched landed data, append-only | Ingestion (EL tool) |
| **Staging / silver** | Cleaned, typed, deduped, renamed | dbt (1:1 with sources) |
| **Marts / gold** | Business-facing models, joined, aggregated | dbt (analytics engineers) |
| **Metrics / semantic layer** | Reusable metric definitions | dbt-metrics, Cube, LookML |

> **Always preserve raw.** If transforms are wrong, you re-run from raw, not re-extract from source.

**Ingestion patterns — pick by latency need:**

| Pattern | Latency | Tools | Use when |
|---|---|---|---|
| **Batch (full or incremental)** | Hours / nightly | Airflow, Cron, Fivetran | Reporting, daily KPIs |
| **Micro-batch** | Minutes | Airbyte, dbt + frequent runs | Near-real-time dashboards |
| **CDC (log-based)** | Seconds | Debezium → Kafka → warehouse | Operational analytics, replication |
| **Streaming** | Milliseconds | Kafka + Flink / Spark Structured Streaming | Real-time fraud, alerts |
| **Event sourcing** | Real-time | App emits events directly to bus | Greenfield, full event-driven |

**Change Data Capture (CDC) — three styles:**

| Method | How | Source impact | Catches deletes? | Latency |
|---|---|---|---|---|
| **Log-based** (Debezium / Maxwell) | Read DB WAL / binlog | Almost none | ✅ | Seconds |
| **Trigger-based** | DB trigger writes to changelog table | Per-write overhead | ✅ | Seconds |
| **Query-based (timestamp poll)** | Periodic `WHERE updated_at > last_run` | Read load, lock-free | ❌ misses deletes, may miss in-second updates | Minutes |

> **Log-based wins** when your DB supports it (PG, MySQL, SQL Server, Mongo, DynamoDB Streams).

**Debezium architecture:**

```
Source DB (WAL/binlog) ─► Debezium connector ─► Kafka topic per table
                                                        ↓
                                  Sinks: warehouse · search · cache · others
```

| Property | Detail |
|---|---|
| Format | Avro / JSON event with `before`, `after`, `op`, `ts_ms` |
| Snapshot on start | Initial backfill, then live tail |
| Schema evolution | Schema registry (Confluent) tracks shape over time |
| Idempotency | Upsert by primary key on the sink |

**Apache Airflow — DAG, operators, scheduling:**

| Concept | Detail |
|---|---|
| **DAG** | Directed acyclic graph of tasks, scheduled (`@daily`, cron, dataset-driven) |
| **Operator** | Task type (`PythonOperator`, `BashOperator`, `KubernetesPodOperator`, `SQLExecuteQueryOperator`) |
| **Task** | One instance of an operator |
| **TaskFlow API** (Airflow 2+) | `@task` decorator — Python functions become tasks |
| **XCom** | Pass small values between tasks |
| **Sensors** | Wait for external condition (file lands, partition appears) |
| **Datasets** | DAGs trigger when an upstream dataset is updated (data-aware scheduling) |
| **Backfills** | `airflow dags backfill` to run historical dates |
| **Pools** | Limit concurrency for shared resources (e.g. one DB) |

**Airflow operational concerns:**

| Concern | Lever |
|---|---|
| Heavy compute in worker | Use `KubernetesPodOperator` to spin up a sidecar |
| Task retries | `retries=3, retry_delay=timedelta(minutes=5), retry_exponential_backoff=True` |
| Idempotent runs | Tasks should be safe to re-run — design with `MERGE` / partition-replace |
| Failure alerting | `on_failure_callback` → Slack / PagerDuty |
| State DB | Postgres metastore — keep it small, prune logs |
| Executor choice | LocalExecutor (dev) / Celery (medium) / Kubernetes (cloud-native) |

**dbt — what it gives you:**

| Capability | What |
|---|---|
| **Models** | `SELECT` statements compiled to `CREATE TABLE/VIEW` |
| **Materializations** | `view`, `table`, `incremental`, `ephemeral`, `materialized_view` |
| **`{{ ref('model') }}`** | Cross-model dependencies → lineage |
| **`{{ source('schema','table') }}`** | Declared raw sources → freshness checks |
| **Tests** | `unique`, `not_null`, `accepted_values`, `relationships`, custom SQL |
| **Snapshots** | SCD Type-2 history of slowly changing dims |
| **Docs site** | Auto-generated lineage + descriptions |
| **Macros / packages** | Jinja templating, reusable SQL |
| **Exposures** | Declare downstream consumers (BI dashboards) for impact analysis |

**Materialization decision:**

| Materialization | Use when |
|---|---|
| `view` | Cheap, always-fresh; small data, transformation logic only |
| `table` | Repeated heavy queries; rebuild full table each run |
| `incremental` | Append-only fact tables, big data, time-partitioned |
| `ephemeral` | Reusable subquery; no DDL — inlined as CTE |
| `materialized_view` | Warehouse-managed (Snowflake, BigQuery) auto-refresh |

**Incremental models — three flavors:**

| Strategy | Mechanism |
|---|---|
| `append` | Just `INSERT` new rows since last run |
| `merge` | Upsert on a unique key (default for warehouses that support `MERGE`) |
| `delete+insert` | Delete partition then re-insert (idempotent re-runs) |
| `insert_overwrite` | Replace whole partition |

**Data quality — the four families:**

| Family | What it checks | Tools |
|---|---|---|
| **Schema** | Expected columns, types, nullability | dbt contracts, Great Expectations |
| **Integrity** | uniqueness, FK relationships, accepted values | dbt tests, Soda Core |
| **Freshness** | Data arrived on time | dbt source freshness, Monte Carlo |
| **Volume / distribution** | Row count, mean/min/max within bounds | Soda, anomaly detection (Monte Carlo, Lightup) |

**Where to put each test:**

| Test | Layer |
|---|---|
| `not_null` / `unique` PKs | Staging |
| Business-rule sanity (`amount >= 0`) | Staging or marts |
| Cross-table relationships | Marts |
| Freshness | Source |
| Volume / drift | Source + marts |

**Pipeline observability:**

| Metric | Why |
|---|---|
| Task duration trend | Detect creep before it breaks SLA |
| Failure rate per DAG | Reliability health |
| Source freshness | Upstream dependency on time? |
| Row counts per layer | Drift, missing data, broken filters |
| Cost per pipeline run | Warehouse $$ for ELT compute |
| Lineage from source → dashboard | Impact analysis when something changes |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Transform-then-load (no raw layer) | Can't re-derive after a logic bug |
| One giant DAG | Hard to retry, hard to test, all-or-nothing failure |
| No tests on staging | Bad data leaks into marts |
| `INSERT INTO` without dedupe | Duplicates on every retry |
| Polling-based CDC on a table with hard-deletes | Silently misses deletions |
| Schema drift unhandled | Downstream queries break — lock with dbt contracts |
| Heavy Python in Airflow worker | Workers OOM; offload to K8s pod operator |
| Treating dbt as the orchestrator | dbt is **transform**, not scheduling — use Airflow / Dagster / Prefect for scheduling |

**Modern stack baseline (cloud, ELT-first):**

| Stage | Tool |
|---|---|
| Sources | App DB, SaaS APIs, event bus |
| EL (extract + load) | Fivetran / Airbyte / Stitch |
| Streaming CDC | Debezium → Kafka |
| Warehouse | Snowflake / BigQuery / Redshift / Databricks |
| Transform | **dbt** |
| Orchestration | Airflow / Dagster / Prefect |
| Quality | dbt tests + Great Expectations / Soda |
| Observability | Monte Carlo / Bigeye / dbt artifacts |
| BI | Looker / Mode / Metabase / Tableau / Hex |

**Rule of thumb:** **ELT, not ETL** — load raw and let the warehouse transform. **Layer raw → staging → marts** so transforms are reproducible. **dbt for transforms; Airflow / Dagster / Prefect for orchestration** — different jobs, different tools. **CDC via log-based (Debezium)** when you need streaming; batch ELT (Fivetran + dbt) when daily is enough. **Tests at every layer** — staging tests catch source issues before they reach marts.
