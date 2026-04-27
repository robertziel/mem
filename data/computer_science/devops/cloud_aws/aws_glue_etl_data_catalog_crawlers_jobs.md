### AWS Glue (ETL & Data Catalog)

**What Glue does:**
- Serverless ETL (Extract, Transform, Load) service
- Data Catalog: central metadata repository for data lake
- Crawlers: auto-discover schema from S3/databases

**Components:**
| Component | Purpose |
|-----------|---------|
| Data Catalog | Metadata store (databases, tables, schemas) |
| Crawlers | Scan data sources, infer schema, populate catalog |
| ETL Jobs | Transform data (PySpark or Python shell) |
| Triggers | Schedule or event-driven job execution |
| Workflows | Orchestrate multiple crawlers and jobs |

**Data Catalog:**
- Central schema registry for your data lake
- Tables describe: location (S3 path), format, columns, partitions
- Used by: Athena, Redshift Spectrum, EMR, Glue ETL
- Like a Hive metastore in the cloud

**Crawlers:**
```
Crawler scans S3 path → infers schema → creates/updates table in Data Catalog

S3: s3://datalake/orders/year=2024/month=01/*.parquet
  → Catalog table: datalake.orders
  → Columns: order_id (bigint), user_id (bigint), total (decimal), ...
  → Partitions: year, month
```

**ETL Jobs (PySpark):**
```python
import sys
from awsglue.context import GlueContext
from pyspark.context import SparkContext

sc = SparkContext()
glueContext = GlueContext(sc)

# Read from catalog
source = glueContext.create_dynamic_frame.from_catalog(
    database="raw_db", table_name="orders"
)

# Transform
from awsglue.transforms import Filter
filtered = Filter.apply(frame=source, f=lambda row: row["total"] > 0)

# Write to S3 in Parquet
glueContext.write_dynamic_frame.from_options(
    frame=filtered,
    connection_type="s3",
    connection_options={"path": "s3://datalake/cleaned/orders/"},
    format="parquet"
)
```

**Glue vs other ETL:**
| Service | Type | Best for |
|---------|------|----------|
| Glue | Serverless Spark ETL | S3 data lake transformations |
| Glue DataBrew | Visual data prep (no code) | Analysts, simple transforms |
| EMR | Managed Spark/Hadoop cluster | Heavy, custom Spark workloads |
| Lambda | Serverless functions | Lightweight transforms (< 15 min) |
| Step Functions + Lambda | Orchestrated lightweight ETL | Simple pipelines |

**Rule of thumb:** Glue Crawlers for schema discovery on S3 data. Glue Data Catalog as the central metadata store (Athena uses it). Glue ETL for Spark-based transformations. For simple transforms, Lambda is cheaper. For heavy Spark, consider EMR for more control.
