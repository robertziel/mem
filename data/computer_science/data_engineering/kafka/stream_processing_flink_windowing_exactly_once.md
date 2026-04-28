### Stream Processing — Flink, Windowing, Exactly-Once

**Definition:** **stream processing** computes over **unbounded** data continuously, vs **batch** which runs over **bounded** datasets. Patterns: stateless transforms (filter / map), stateful (aggregations, joins, dedup), with **windowing** (tumbling / sliding / session) and **watermarks** for late events. **Exactly-once** is hard; **at-least-once + idempotent consumer** is the practical default.

**Batch vs Stream — side by side:**

| Property | **Batch** | **Stream** |
|---|---|---|
| Latency | Minutes to hours | Milliseconds to seconds |
| Data | **Bounded** (complete dataset) | **Unbounded** (continuous) |
| Processing | Run to completion | Always running |
| Use case | Reports, ML training, ETL | Real-time alerts, live dashboards, fraud |
| Tools | Spark, Hadoop, dbt | Kafka Streams, Flink, Spark Streaming |
| Re-processing | Re-run job | Replay from log |

**Stream patterns:**

| Type | Examples |
|---|---|
| **Stateless transforms** | Filter, map, route, format conversion |
| **Stateful transforms** | Aggregations, joins, dedup, windowed counts |
| **Stateful needs** | In-memory state + changelog for recovery |

**Stateless examples:**

| Operation | Detail |
|---|---|
| **Filter** | Drop events not matching criteria |
| **Map** | Transform each event independently |
| **Route** | Send events to different topics |
| **Enrich** | Attach static data |

**Stateful examples:**

| Operation | Detail |
|---|---|
| **Aggregation** | Count / sum / avg over windows |
| **Stream-stream join** | Combine events from two streams within window |
| **Stream-table join** | Look up a value (e.g., enrich event with user info) |
| **Deduplication** | Track seen IDs, drop duplicates |
| **Pattern detection** | "A then B within 5s" |

**Windowing — group events by time:**

| Window | How | Use case |
|---|---|---|
| **Tumbling** | Fixed, non-overlapping (every 5 min) | Periodic aggregation |
| **Sliding / Hopping** | Fixed, overlapping (5 min every 1 min) | Moving averages |
| **Session** | Variable, gap-based (timeout) | User session activity |
| **Global** | Single unbounded window | Custom triggers |

**Window visualization:**

```
Tumbling (5 min): |──5min──|──5min──|──5min──|

Hopping (5m/1m):  |─5min─|
                       |─5min─|
                            |─5min─|

Session:          |events──gap──| |events──gap──|
                  ↑           ↑   ↑           ↑
               start        end start         end
```

**Late arrivals + watermarks:**

| Concept | Detail |
|---|---|
| **Event time** | When the event happened |
| **Processing time** | When the system saw it |
| **Watermark** | "All events before this timestamp have arrived" |
| **Allowed lateness** | Accept late events for N seconds after watermark |
| Too-early close | Missed events |
| Too-late close | High latency |
| Side output for late events | Don't drop silently |

**Exactly-once vs at-least-once:**

| Guarantee | How | Cost |
|---|---|---|
| **At-most-once** | Fire-and-forget | Lossy |
| **At-least-once** | Retry until ACK | Duplicates possible |
| **Exactly-once** | Atomic source-process-sink | Complex |
| **Practical exactly-once** | At-least-once + idempotent consumer | Common |

**How exactly-once is achieved:**

| System | Mechanism |
|---|---|
| **Kafka Streams** | Transactional producer + consumer offsets in same transaction |
| **Flink** | Distributed snapshots (Chandy-Lamport algorithm) |
| **Spark Structured Streaming** | Idempotent sink + checkpointing |
| In practice | **Idempotent consumers** (with dedup keys) |

**Stream-processing tools:**

| Tool | Type | Best for |
|---|---|---|
| **Kafka Streams** | Library (JVM) | Lightweight, embedded in microservices |
| **Apache Flink** | Cluster framework | Complex event processing, exactly-once |
| **Spark Structured Streaming** | Cluster framework | Batch + stream unified |
| **KSQL / ksqlDB** | SQL on streams | SQL users, simple transformations |
| **AWS Kinesis Data Analytics** | Managed Flink/SQL | AWS-native, fully managed |
| **Materialize** | OLAP-on-stream | Real-time materialized views over Kafka |
| **Apache Beam** | Abstraction over runners | Multi-runtime portability |

**Kafka Streams example (JVM):**

```java
StreamsBuilder builder = new StreamsBuilder();
builder.stream("orders")
    .filter((key, order) -> order.getTotal() > 100)
    .groupByKey()
    .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
    .count()
    .toStream()
    .to("high-value-order-counts");
```

**Flink example (Java):**

```java
DataStream<Order> orders = env
    .addSource(new FlinkKafkaConsumer<>("orders", schema, props))
    .assignTimestampsAndWatermarks(
        WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofSeconds(5))
    );

orders
    .keyBy(Order::getCustomerId)
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .reduce((a, b) -> new Order(a.id, a.total + b.total))
    .addSink(new FlinkKafkaProducer<>("aggregated", schema, props));
```

**State backend options (Flink):**

| Backend | Detail |
|---|---|
| **HashMap** | In-memory, fast, lost on failure (with checkpointing → durable) |
| **RocksDB** | On-disk, larger state, slower per-op |
| **Async checkpointing** | Snapshot state to S3 / HDFS without pausing |

**Windowing decision matrix:**

| Need | Window |
|---|---|
| "Per-minute count" | Tumbling 1-min |
| "Average over last 5 minutes, updated every minute" | Sliding 5m/1m |
| "User session metrics" | Session with N-min gap |
| "Total since start" | Global with manual triggers |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Top-K** | Per-window top-N rankings |
| **Real-time leaderboard** | Sorted set of users by score |
| **Anomaly detection** | Compare to rolling baseline |
| **Fraud detection** | Multi-stream join on user activity |
| **Materialized view** | Stream → continuously refreshed table |
| **Change Data Capture** (CDC) | DB change → stream → downstream |

**Backpressure handling:**

| Symptom | Solution |
|---|---|
| Source faster than sink | Buffer, drop, sample, or scale sink |
| Hot key | Re-key, shard, or pre-aggregate |
| Memory pressure | RocksDB state backend |
| Slow checkpoint | Incremental checkpoints (Flink) |
| Backed-up partitions | Add more consumers (up to partition count) |

**Operational concerns:**

| Concern | Detail |
|---|---|
| **Checkpoint interval** | Trade-off: more frequent = faster recovery, more overhead |
| **Parallelism** | Tasks per operator (often = partition count) |
| **State size** | Watch memory + disk |
| **Monitoring** | Lag, throughput, watermark progression |
| **Reprocessing** | Replay from offset to fix bugs |
| **Schema evolution** | Backward-compatible event formats |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using processing time when event time matters | Wrong aggregations on late data |
| No watermark | Late events dropped silently |
| State unbounded growth | OOM eventually |
| Forgetting idempotency | Duplicates corrupt state |
| Hot keys | One worker overloaded |
| Slow checkpoints | Lag grows |
| No DLQ for unprocessable | Lost events |
| Mixing exactly-once with at-most-once sink | Loses guarantees |
| Reprocessing without re-keying | Pollute downstream |

**Decision matrix:**

| Need | Pick |
|---|---|
| Lightweight stream in JVM service | Kafka Streams |
| Complex stateful processing | Flink |
| Existing Spark cluster | Spark Structured Streaming |
| SQL-only team | ksqlDB / Materialize |
| AWS-native, no ops | Kinesis Data Analytics |
| Multi-runtime portability | Apache Beam |

**Cross-references:**

- Kafka deep dive: [kafka_*.md](../kafka/kafka_event_streaming_topic_partition_offset.md)
- Message queues + event-driven: [message_queues_*.md](../../system_design_hld_high_level_design/fundamentals/message_queues_event_driven_kafka_sqs_pub_sub.md)
- AWS Kinesis: [aws_kinesis_*.md](../../devops/cloud_aws/aws_kinesis_data_streams_firehose_realtime_streaming.md)
- CDC + Debezium: [cdc_*.md](../cdc_debezium_change_data_capture_wal_outbox.md)

**Rule of thumb:** **Stream processing for real-time reactions** (fraud, alerts, live metrics); **batch for historical analysis** (reports, ML training). **Kafka Streams** for lightweight in-service processing; **Flink** for complex stateful pipelines at scale; **ksqlDB / Materialize** for SQL-only teams. **Always handle late arrivals** with watermarks + allowed lateness. **Idempotent consumers + at-least-once** is the practical exactly-once.
