### AWS Kinesis — Data Streams, Firehose, Analytics

**Definition:** AWS's family of real-time streaming services. **Kinesis Data Streams** = self-managed stream (Kafka analog); **Firehose** = managed delivery to S3/Redshift/OpenSearch; **Analytics** = SQL/Flink on streams; **Video Streams** = (niche). Pick **Firehose** when you just want data delivered, **Streams** when you need replay, ordering, or custom consumers.

**The Kinesis family:**

| Service | Purpose | Analogy |
|---|---|---|
| **Data Streams** | Real-time stream + custom consumers | Self-managed Kafka |
| **Data Firehose** | Managed delivery to S3/Redshift/OpenSearch | Managed ETL pipe |
| **Data Analytics** | SQL/Flink on streams | Stream processing |
| **Video Streams** | Stream and process video | (specialty) |
| **MSK** (Managed Kafka) | Apache Kafka, managed | Kafka itself |

**Kinesis Data Streams architecture:**

```
   Producers (apps, devices, agents)
       │
       │ (PutRecord with partition key)
       ▼
   ┌─────────────────────────────────────┐
   │  Stream                              │
   │   ┌──────┐  ┌──────┐  ┌──────┐      │
   │   │Shard1│  │Shard2│  │Shard3│      │
   │   └──────┘  └──────┘  └──────┘      │
   └─────────────────────────────────────┘
       │
       ▼ (consumers pull)
   Lambda / ECS / EC2 / KCL / firehose
```

| Concept | Detail |
|---|---|
| **Shard** | Unit of throughput (1 MB/s in, 2 MB/s out, 1000 records/s in) |
| **Partition key** | Hash → routes record to a shard |
| **Sequence number** | Per-shard ordering |
| **Retention** | 24 hrs default, up to 365 days |
| **Ordering** | Within a shard (same partition key) |
| **On-Demand mode** | Auto-scale shards (newer, simpler) |
| **Provisioned mode** | Manage shards manually (cheaper at scale) |

**Kinesis vs Kafka vs SQS:**

| Property | **Kinesis Streams** | **Kafka (MSK)** | **SQS** |
|---|---|---|---|
| Model | Streaming (pull) | Streaming (pull) | Queue (poll/delete) |
| Ordering | Per shard | Per partition | FIFO option only |
| Replay | ✅ Yes (retention) | ✅ Yes | ❌ Deleted after ACK |
| Throughput | Per shard (add shards) | Per partition | Virtually unlimited |
| Management | Fully managed | Self/MSK managed | Fully managed |
| Cost | Per shard-hour + data | Per broker | Per request |
| Multi-consumer | Each gets all data | Consumer groups (split or all) | One consumer per message |
| Best for | AWS-native streaming | Heavy streaming, Kafka ecosystem | Job queues, decoupling |

**Kinesis Data Firehose — the "just get me to S3" service:**

```
   Producers
       │
       ▼
   ┌─────────────────────────────────────┐
   │  Firehose (no shard management)     │
   └────────────┬────────────────────────┘
                │ (optional: Lambda transform)
                ▼
       ┌──────────────────────────┐
       │ Destinations              │
       │  ├─ S3                     │
       │  ├─ Redshift               │
       │  ├─ OpenSearch / Splunk    │
       │  ├─ HTTP endpoint         │
       │  └─ DataBricks / Snowflake │
       └──────────────────────────┘
```

| Property | Detail |
|---|---|
| **Zero shard management** | Auto-scales |
| **Near real-time** | Buffer: 60s OR 1 MB (whichever first) |
| Optional Lambda transform | Filter, enrich, format |
| Format conversion | JSON → Parquet/ORC for cheap querying |
| Compression | GZIP / Snappy / ZIP |
| Error handling | S3 fallback for failed deliveries |
| **Use when**: just want data in S3/Redshift/OpenSearch | No custom consumers needed |

**Streams vs Firehose — decision:**

| Need | Pick |
|---|---|
| Just deliver data to S3 / Redshift / OpenSearch | **Firehose** |
| Custom consumers / processing | **Streams** |
| Replay capability | **Streams** |
| Sub-second latency | **Streams** |
| Zero administration | **Firehose** |
| > 60s buffering OK | Firehose |

**Provisioned vs On-Demand mode (Streams):**

| Property | Provisioned | On-Demand |
|---|---|---|
| Manage shards | Manually | Auto |
| Cost | Per-shard-hour | Per-GB ingested + data |
| Scale | Manual reshard | Auto (within limits) |
| Latency | Predictable | Auto-scaling lag during spikes |
| Best for | Stable, high-volume | Variable, unpredictable |

**Common patterns:**

**Clickstream analytics:**

```
Web/Mobile → API Gateway → Firehose → S3 → Athena (query) / Glue (ETL)
```

**Real-time log processing:**

```
App logs → Kinesis Streams → Lambda (filter/enrich) → OpenSearch
```

**IoT data ingestion:**

```
Devices → Streams → Kinesis Analytics (windowed aggregations) → DynamoDB
```

**CDC pipeline:**

```
DMS / Debezium → Streams → Lambda → Snowflake / Redshift
```

**Lambda as Kinesis consumer (SAM):**

```yaml
Events:
  KinesisEvent:
    Type: Kinesis
    Properties:
      Stream: !GetAtt MyStream.Arn
      StartingPosition: LATEST       # or TRIM_HORIZON, AT_TIMESTAMP
      BatchSize: 100                  # records per invocation
      MaximumBatchingWindowInSeconds: 5
      ParallelizationFactor: 10       # 10 concurrent Lambda per shard (optional)
      BisectBatchOnFunctionError: true
```

| Property | Detail |
|---|---|
| Each shard → one Lambda invocation at a time | Default |
| `ParallelizationFactor` (1–10) | More concurrent Lambdas per shard |
| `BatchSize` | Up to 10K records per invocation |
| `BisectBatchOnFunctionError` | Halve and retry on failure |
| Retry on Lambda error | Until expired or success |
| `OnFailure` destination (DLQ) | After retries exhausted |

**Producer best practices:**

| Practice | Detail |
|---|---|
| Pick a good partition key | Even distribution across shards |
| Avoid hot partitions | Most-active key = hot shard |
| Use Producer Library (KPL) | Aggregation + retry built-in |
| Batch via `PutRecords` | Up to 500 records / 5 MB per call |
| Handle `ProvisionedThroughputExceeded` | Backoff + retry |
| Compress payloads | Reduce bytes |

**Hot shard problem:**

```
   Many records share one partition key
       → all go to one shard
       → shard at 1 MB/s ingest limit
       → producer throttled

   Fix: better partition key distribution, OR add random suffix
```

**Resharding:**

| Operation | Detail |
|---|---|
| **Split shard** | Split a hot shard into two |
| **Merge shards** | Combine two cold shards |
| Costs | Per-shard-hour billing |
| Triggers | Throughput thresholds |
| On-Demand mode handles this automatically | Most users prefer |

**Kinesis Analytics — windowed aggregations:**

| Pattern | Example |
|---|---|
| Tumbling window | "Total clicks per minute" |
| Sliding window | "Avg over last 5 min, every 1 min" |
| Session window | "Group events by user, gap < 30 min" |
| Stagger window | "Activity bursts" |
| Custom Flink applications | Full Flink power |

**Cost levers:**

| Lever | Detail |
|---|---|
| Right-size shards | Don't over-provision |
| Use On-Demand for unpredictable | Pay per GB |
| Compress before producing | Less data = less cost |
| Aggregate in KPL | Pack many small records into one Kinesis record |
| Use Firehose if Streams' replay isn't needed | Cheaper |
| Lifecycle to colder S3 storage | Long-term retention |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Partition key with low cardinality | Hot shards |
| Single Lambda per shard at high volume | Throttling, lag |
| Not handling `ProvisionedThroughputExceeded` | Lost records |
| No DLQ for failed Lambda invocations | Silent failures |
| Firehose for replay | Wrong tool — use Streams |
| `BatchSize` too small | Many invocations, high cost |
| `BatchSize` too large | Long Lambda runs, timeout risk |
| No retention planning | Old data rolls off, can't replay |
| Over-buying shards | $$$ for idle capacity |
| Order assumed across shards | Only per-shard |

**Cross-references:**

- Kafka in-depth: [kafka_*.md](../../data_engineering/kafka_event_streaming_topic_partition_offset.md)
- Message queues vs streams: [message_queues_*.md](../../system_design_hld_high_level_design/fundamentals/message_queues_event_driven_kafka_sqs_pub_sub.md)
- CDC + Debezium + outbox: [cdc_*.md](../../data_engineering/cdc_debezium_change_data_capture_wal_outbox.md)
- AWS Lambda + cold start: [lambda_*.md](lambda_cold_start_layers_concurrency.md)

**Rule of thumb:** **Firehose for "deliver data to S3 / Redshift / OpenSearch"** (zero management, near real-time). **Data Streams when you need custom consumers, replay, or sub-second latency**. Use **MSK (Kafka)** if you need Kafka ecosystem or cross-cloud. **SQS for simple job queues** (not streaming). Pick a **partition key with high cardinality** — hot shards kill throughput. **On-Demand mode** is the easy default unless you have stable high volume.
