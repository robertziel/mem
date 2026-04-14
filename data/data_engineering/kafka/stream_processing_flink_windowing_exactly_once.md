### Stream Processing

**Batch vs Stream:**
| Feature | Batch | Stream |
|---------|-------|--------|
| Latency | Minutes to hours | Milliseconds to seconds |
| Data | Bounded (complete dataset) | Unbounded (continuous) |
| Processing | Run to completion | Always running |
| Use case | Reports, ML training, ETL | Real-time alerts, live dashboards |
| Tools | Spark, Hadoop, dbt | Kafka Streams, Flink, Spark Streaming |

**Stream processing patterns:**

**Stateless transformations:**
- Filter: drop events that don't match criteria
- Map: transform each event independently
- Route: send events to different topics based on content

**Stateful transformations:**
- Aggregation: count, sum, average over windows
- Join: combine events from different streams
- Deduplication: track seen events, drop duplicates
- Require state management (in-memory + changelog for recovery)

**Windowing (grouping events by time):**
| Window type | Description | Use case |
|-------------|------------|----------|
| Tumbling | Fixed, non-overlapping (every 5 min) | Periodic aggregation |
| Sliding/Hopping | Fixed, overlapping (5 min every 1 min) | Moving averages |
| Session | Variable, gap-based (timeout) | User session activity |

```
Tumbling (5 min):  |--window--|--window--|--window--|
Hopping (5m/1m):   |--window--|
                      |--window--|
                         |--window--|
Session:           |--events--gap--| |--events--gap--|
```

**Late arrivals and watermarks:**
- Events may arrive out of order (network delays)
- Watermark: "all events before this timestamp have arrived"
- Allowed lateness: accept late events for N seconds after watermark
- Too early close = missed events, too late close = high latency

**Stream processing tools:**

| Tool | Type | Best for |
|------|------|----------|
| Kafka Streams | Library (JVM) | Lightweight, embedded in microservices |
| Apache Flink | Cluster framework | Complex event processing, exactly-once |
| Spark Structured Streaming | Cluster framework | Batch + stream unified |
| KSQL / ksqlDB | SQL on streams | SQL users, simple transformations |
| AWS Kinesis | Managed service | AWS-native, simpler than Kafka |

**Kafka Streams example:**
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

**Exactly-once processing:**
- Read from source, process, write to sink - all atomically
- Kafka: transactional producer + consumer offset commit in same transaction
- Flink: distributed snapshots (Chandy-Lamport algorithm)
- In practice: idempotent consumers are simpler and more portable

**Rule of thumb:** Use stream processing for real-time reactions (fraud detection, alerting, live metrics). Use batch for historical analysis and ML training. Kafka Streams for simple stream processing embedded in services. Flink for complex, stateful processing at scale. Always handle late arrivals.
