### ETL, ELT, and Data Pipelines

**ETL (Extract, Transform, Load):**
```
Source -> Extract -> Transform (clean, enrich, aggregate) -> Load -> Data Warehouse
```
- Transform before loading into destination
- Traditional approach (on-prem, limited warehouse compute)
- Tools: Apache Airflow, Luigi, custom scripts

**ELT (Extract, Load, Transform):**
```
Source -> Extract -> Load (raw) -> Transform in warehouse
```
- Load raw data first, transform using warehouse compute power
- Modern approach (cloud warehouses are powerful and elastic)
- Tools: Fivetran/Airbyte (EL) + dbt (T)

**ETL vs ELT:**
| Feature | ETL | ELT |
|---------|-----|-----|
| Transform location | Before load (staging area) | After load (in warehouse) |
| Best for | Limited warehouse compute | Cloud warehouses (BigQuery, Snowflake) |
| Flexibility | Schema fixed before load | Raw data preserved, transform later |
| Tools | Airflow, Spark, custom | Fivetran + dbt, Stitch + dbt |

**Change Data Capture (CDC):**
- Capture changes (INSERT, UPDATE, DELETE) from source database
- Stream changes to downstream systems in real-time
- Methods:
  - **Log-based** - read DB's WAL/binlog (Debezium) - best, no impact on source
  - **Trigger-based** - DB triggers write to changelog table - simple but impacts performance
  - **Query-based** - poll for changes using timestamps - misses deletes, has lag

**Debezium (popular CDC tool):**
```
PostgreSQL WAL -> Debezium -> Kafka -> Consumers (warehouse, cache, search)
```
- Captures every change as an event
- Supports: PostgreSQL, MySQL, MongoDB, SQL Server
- Integrates with Kafka Connect

**Apache Airflow (workflow orchestrator):**
```python
# DAG definition
with DAG('daily_etl', schedule_interval='@daily') as dag:
    extract = PythonOperator(task_id='extract', python_callable=extract_data)
    transform = PythonOperator(task_id='transform', python_callable=transform_data)
    load = PythonOperator(task_id='load', python_callable=load_data)
    notify = SlackOperator(task_id='notify', message='ETL complete')

    extract >> transform >> load >> notify
```
- DAGs (Directed Acyclic Graphs) define task dependencies
- Scheduling, retries, backfills, monitoring
- UI for visualizing pipeline runs

**dbt (data build tool):**
- Transform data in the warehouse using SQL
- Version-controlled SQL models (SELECT statements)
- Tests, documentation, lineage tracking
- Runs against: BigQuery, Snowflake, Redshift, PostgreSQL

```sql
-- models/daily_revenue.sql
SELECT
  date_trunc('day', created_at) AS day,
  SUM(total) AS revenue,
  COUNT(*) AS order_count
FROM {{ ref('stg_orders') }}
WHERE status = 'completed'
GROUP BY 1
```

**Data quality checks:**
- Schema validation (expected columns, types)
- Null checks, uniqueness checks
- Freshness checks (data arrived on time?)
- Volume checks (row count within expected range)
- Tools: Great Expectations, dbt tests, Soda

**Rule of thumb:** Use ELT for modern cloud warehouses (load raw, transform with dbt). Use CDC (Debezium) for real-time replication. Airflow for orchestrating complex pipelines. Always add data quality checks. Preserve raw data (transform into layers: raw -> staging -> marts).
