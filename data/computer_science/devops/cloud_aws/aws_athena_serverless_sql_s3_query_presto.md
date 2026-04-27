### AWS Athena (Serverless SQL on S3)

**What Athena does:**
- Query data in S3 using standard SQL (Presto/Trino engine)
- No infrastructure to manage — serverless, pay per query
- Supports: CSV, JSON, Parquet, ORC, Avro

**Use cases:**
- Ad-hoc queries on log files (CloudTrail, ALB, VPC Flow Logs)
- Analyze data lake in S3 without loading into a database
- Quick analytics without setting up Redshift
- Query results from ETL pipelines

**Basic query:**
```sql
-- Create external table pointing to S3
CREATE EXTERNAL TABLE alb_logs (
  type string,
  time string,
  elb string,
  client_ip string,
  target_ip string,
  request_url string,
  status_code int
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe'
LOCATION 's3://my-alb-logs/AWSLogs/';

-- Query
SELECT status_code, COUNT(*) as count
FROM alb_logs
WHERE time > '2024-01-01'
GROUP BY status_code
ORDER BY count DESC;
```

**Pricing:**
- $5 per TB scanned
- Reduce cost by: using columnar format (Parquet → 30-90% less scanned), partitioning data, compressing

**Performance optimization:**
| Technique | Effect |
|-----------|--------|
| Parquet/ORC format | Columnar, only reads needed columns (huge savings) |
| Partitioning | `s3://bucket/year=2024/month=01/` → skip irrelevant partitions |
| Compression | gzip/snappy/zstd reduces data scanned |
| CTAS (Create Table As) | Materialize results for repeated queries |

**Athena vs Redshift vs Glue:**
| Service | Type | Best for |
|---------|------|----------|
| Athena | Serverless SQL on S3 | Ad-hoc queries, log analysis |
| Redshift | Data warehouse (provisioned) | Heavy analytics, BI dashboards |
| Glue | ETL + Data Catalog | Data transformation, schema discovery |

**Rule of thumb:** Athena for ad-hoc queries on S3 data (no infrastructure). Convert to Parquet and partition for cost/speed. Use Redshift for repeated heavy analytics. Glue for ETL and cataloging data that Athena queries.
