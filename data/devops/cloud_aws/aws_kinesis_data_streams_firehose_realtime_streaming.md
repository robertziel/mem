### AWS Kinesis

**Kinesis family:**
| Service | Purpose | Analogy |
|---------|---------|---------|
| Kinesis Data Streams | Real-time data streaming (custom consumers) | Self-managed Kafka |
| Kinesis Data Firehose | Deliver streaming data to destinations (S3, Redshift, Elasticsearch) | Managed ETL pipe |
| Kinesis Data Analytics | SQL/Flink on streaming data | Managed stream processing |
| Kinesis Video Streams | Stream and process video | (niche) |

**Kinesis Data Streams:**
```
Producers → [Shard 1] [Shard 2] [Shard 3] → Consumers (Lambda, ECS, EC2)
```

- **Shard**: unit of throughput (1 MB/s in, 2 MB/s out, 1000 records/s)
- **Partition key**: determines which shard receives the record
- **Retention**: 24 hours (default) up to 365 days
- **Ordering**: guaranteed within a shard (same partition key → same shard)

**Kinesis vs Kafka vs SQS:**
| Feature | Kinesis Streams | Kafka (MSK) | SQS |
|---------|----------------|-------------|-----|
| Model | Streaming (pull) | Streaming (pull) | Queue (poll/delete) |
| Ordering | Per shard | Per partition | FIFO only |
| Replay | Yes (retention) | Yes (retention) | No (deleted after read) |
| Throughput | Per shard (scale by adding shards) | Per partition | Virtually unlimited |
| Management | Fully managed | Self/managed (MSK) | Fully managed |
| Cost | Per shard-hour + data | Per broker | Per request |
| Best for | AWS-native streaming | Heavy streaming, Kafka ecosystem | Job queues, decoupling |

**Kinesis Data Firehose (simplest):**
```
Producers → Firehose → [optional: Lambda transform] → Destination
                                                        ├── S3
                                                        ├── Redshift
                                                        ├── Elasticsearch
                                                        └── Splunk
```
- Zero administration (no shards to manage)
- Near real-time (buffers: 60s or 1 MB, whichever first)
- Auto-scales
- Optional data transformation via Lambda
- Use when: you just want data delivered to S3/Redshift/ES

**Common patterns:**

**Clickstream analytics:**
```
Web/Mobile → API Gateway → Kinesis Firehose → S3 → Athena (query)
```

**Real-time log processing:**
```
App logs → Kinesis Streams → Lambda (filter/enrich) → Elasticsearch
```

**IoT data ingestion:**
```
Devices → Kinesis Streams → Kinesis Analytics (aggregation) → DynamoDB
```

**Lambda as Kinesis consumer:**
```yaml
# SAM/CloudFormation
Events:
  KinesisEvent:
    Type: Kinesis
    Properties:
      Stream: !GetAtt MyStream.Arn
      StartingPosition: LATEST
      BatchSize: 100
      MaximumBatchingWindowInSeconds: 5
```

**Rule of thumb:** Firehose for simple delivery to S3/Redshift (zero management). Data Streams when you need custom consumers, replay, or sub-second latency. Use Kafka (MSK) if you need the Kafka ecosystem or cross-cloud portability. SQS for simple job queues (not streaming).
