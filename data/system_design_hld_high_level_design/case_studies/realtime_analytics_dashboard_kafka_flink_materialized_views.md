### Design a Real-Time Analytics Dashboard

**Requirements:**
- Display live metrics: orders/min, revenue/region, error rates, p99 latency
- Sub-second refresh (not batch — truly real-time)
- Support drill-down (by region, product, time range)
- Handle millions of events/sec from multiple sources
- Historical queries (last 7 days) alongside real-time

**Architecture:**
```
┌──────────┐    ┌───────┐    ┌───────────┐    ┌────────────────┐    ┌───────────┐
│ Services │───>│ Kafka │───>│   Flink   │───>│ Materialized   │───>│ Dashboard │
│ (events) │    │       │    │ (stream   │    │ Views (Redis/  │    │ (WebSocket│
└──────────┘    └───────┘    │  process) │    │  TimescaleDB)  │    │  + React) │
                             └───────────┘    └────────────────┘    └───────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ Data Lake   │
                           │ (S3/Iceberg)│
                           │ (historical)│
                           └─────────────┘
```

**Kafka topics (raw events from services):**
```
events.orders          — { order_id, amount, region, product_id, ts }
events.page_views      — { url, user_id, session_id, ts }
events.api_calls       — { endpoint, status_code, latency_ms, ts }
events.errors          — { service, error_type, stack_trace, ts }
```

**Flink streaming aggregations:**
```sql
-- Orders per minute by region (tumbling window)
CREATE TABLE orders_per_minute AS
SELECT
  region,
  TUMBLE_START(event_time, INTERVAL '1' MINUTE) AS window_start,
  COUNT(*) AS order_count,
  SUM(amount) AS revenue
FROM orders
GROUP BY region, TUMBLE(event_time, INTERVAL '1' MINUTE);

-- P99 latency per endpoint (sliding window, 5min range, 1min slide)
CREATE TABLE latency_percentiles AS
SELECT
  endpoint,
  HOP_START(event_time, INTERVAL '1' MINUTE, INTERVAL '5' MINUTE) AS window_start,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50,
  COUNT(*) AS request_count
FROM api_calls
GROUP BY endpoint, HOP(event_time, INTERVAL '1' MINUTE, INTERVAL '5' MINUTE);

-- Error rate per service (tumbling 1min window)
CREATE TABLE error_rates AS
SELECT
  service,
  TUMBLE_START(event_time, INTERVAL '1' MINUTE) AS window_start,
  COUNT(*) FILTER (WHERE status_code >= 500) AS errors,
  COUNT(*) AS total,
  CAST(COUNT(*) FILTER (WHERE status_code >= 500) AS DOUBLE) / COUNT(*) AS error_rate
FROM api_calls
GROUP BY service, TUMBLE(event_time, INTERVAL '1' MINUTE);
```

**Materialized views storage:**

| Metric | Store | Why |
|--------|-------|-----|
| Real-time counters (orders/min) | Redis (sorted sets + TTL) | Sub-ms reads, auto-expiry |
| Time-series (latency, error rate) | TimescaleDB | SQL queries, retention policies, downsampling |
| Top-N (top products, regions) | Redis (sorted sets) | O(log N) updates, O(log N + M) range queries (ZRANGE / ZREVRANGE) |
| Historical (7d+) | S3 + Iceberg / ClickHouse | Cheap, columnar, fast aggregations |

**Redis materialized view pattern:**
```
# Real-time counters (auto-expire after 1 hour)
INCR  dashboard:orders:us-east:202506151430    # orders count for region+minute
EXPIRE dashboard:orders:us-east:202506151430 3600

# Revenue (sorted set by minute)
ZINCRBY dashboard:revenue:us-east 299.99 "202506151430"

# Top products (sorted set, keep top 100)
ZINCRBY dashboard:top_products 1 "product_123"
ZREMRANGEBYRANK dashboard:top_products 0 -101  # trim to top 100
```

**Dashboard delivery — WebSocket push:**
```
Browser ◄──── WebSocket ◄──── Dashboard API ◄──── Redis pub/sub

1. Flink writes aggregation to Redis
2. Flink also publishes to Redis pub/sub channel "dashboard:updates"
3. Dashboard API subscribes to channel, pushes to connected WebSocket clients
4. React frontend receives and re-renders affected widgets

Alternative: Server-Sent Events (SSE) — simpler, one-directional
- SSE for dashboards (server → client only)
- WebSocket if user needs to interact (filter, drill-down in real-time)
```

**Handling late-arriving events (watermarks):**
```
Problem: event generated at 14:30:00 arrives at 14:30:05 (network delay)
         → the 14:30 window might already be closed

Solution: Flink watermarks
- Watermark = "I've seen all events up to time T"
- Allow lateness: INTERVAL '30' SECOND
- Late events update the already-emitted window result (retraction)
- Very late events (> 30s) → route to late-events topic for batch correction
```

**Drill-down queries (historical):**
```sql
-- TimescaleDB: revenue by region, last 24 hours, 5-minute buckets
SELECT
  time_bucket('5 minutes', ts) AS bucket,
  region,
  SUM(revenue) AS total_revenue
FROM orders_aggregated
WHERE ts > NOW() - INTERVAL '24 hours'
  AND region = 'us-east'
GROUP BY bucket, region
ORDER BY bucket;

-- ClickHouse (for large-scale historical analytics)
SELECT
  toStartOfHour(event_time) AS hour,
  product_category,
  count() AS orders,
  sum(amount) AS revenue
FROM orders
WHERE event_time >= now() - INTERVAL 7 DAY
GROUP BY hour, product_category
ORDER BY hour;
```

**Scaling considerations:**
- Kafka partitions: partition by region or service for parallel processing
- Flink: parallelism = Kafka partition count, checkpoint every 10s
- Redis cluster: shard by metric key prefix
- TimescaleDB: hypertable with automatic partitioning by time
- Pre-aggregate at multiple granularities: 1min, 5min, 1hr, 1day

**Rule of thumb:** Pre-compute aggregations in Flink, don't query raw events at dashboard load. Store real-time counters in Redis (fast, auto-expiry), time-series in TimescaleDB (SQL, retention), historical in columnar store (ClickHouse/Iceberg). Push updates via WebSocket/SSE, don't poll. Always handle late events with watermarks — real-time data is never perfectly on time.
