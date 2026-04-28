### Store-and-Forward (SAF) — Offline Resilience Pattern

**Definition:** when the network to the upstream service is down, the local node **stores** transactions in a durable FIFO queue and **forwards** them once connectivity returns. Used in payments (POS terminals), mobile apps, IoT, edge networks, and any system that must keep operating during outages.

**Where you'll see SAF:**

| Domain | Example |
|---|---|
| Payment terminals (Visa / Mastercard / EMV) | POS continues to accept cards when network is down |
| Mobile apps | Queue API calls offline, sync on reconnect |
| Vehicle telematics | Store sensor data on-board, upload when in range |
| IoT gateways | Buffer device telemetry during cloud outages |
| Kafka producers | `linger.ms` + `batch.size` is mini-SAF |
| Sidekiq / Resque retry queues | In-process SAF for failing jobs |
| Outbox pattern | DB table → external bus on retry |
| CDN edge | Buffer log records, forward to origin |
| Database WAL replication | Followers buffer when primary unreachable |

**Visa POS — concrete model:**

```
Normal:   Terminal → Acquirer → VisaNet → Issuer
                  (real-time connection)

Offline:  Terminal ──[SAF queue]──X──(no connection)
              │
              │  connectivity returns
              ▼
          Terminal → Acquirer  (batch upload)
```

| Concept | Detail |
|---|---|
| FIFO queue per terminal | Transactions kept in arrival order |
| SAF reference number | Each queued txn assigned a local ID |
| Periodic upload attempt | Every N seconds (typical 60 s) |
| Auto-upload on idle | When terminal not busy |
| Max queue depth | Bound risk if outage is long |
| Max transaction age | Older than N → move to exception |
| Stand-in approval | Issuer (or acquirer) may pre-approve under risk thresholds |

**SAF transaction state machine:**

| State | Meaning |
|---|---|
| `eligible` | Queued, waiting to send |
| `in-flight` | Upload in progress |
| `processed` | Host approved; transaction complete |
| `declined` | Host declined → merchant must void / refund |
| `failed` | Upload attempts exhausted → move to dead-letter |
| `expired` | Age limit hit before upload succeeded |

**Risk dial — you trade availability for fraud exposure:**

| Knob | Effect |
|---|---|
| Auth amount cap | Cap the dollar value accepted offline |
| Per-card velocity | "Max 3 offline txns per card per day" |
| Trust score | Use issuer-supplied risk score; tighter caps on unknown cards |
| Stand-in window | Time-box how long offline mode is allowed |
| Required online ratio | "Once back online, require N% online before reverting to caps" |
| Forced PIN / signature | More auth ceremony when offline |

**Generic SAF design pattern:**

| Component | Role |
|---|---|
| **Local durable store** | Disk-backed queue (SQLite, embedded RDB, append-only file) |
| **Producer** | Writes to local store first, then attempts upload |
| **Forwarder** | Polls store, sends to upstream, marks processed |
| **Dead-letter / exception queue** | Failed-after-N-retries entries |
| **Reconciliation** | After power-on, scan inflight + recover |
| **Config** | Max queue size, max age, retry policy, risk caps |
| **Observability** | Queue depth, upload success rate, age of oldest item |

**Outbox pattern — the application-level cousin:**

```ruby
# Single DB transaction guarantees event + business write are atomic
ActiveRecord::Base.transaction do
  Order.create!(order_params)
  Outbox.create!(event_type: "order_created", payload: order.as_json)
end

# Forwarder polls and ships
class OutboxProcessor
  def call
    Outbox.where(status: "pending").order(:created_at).find_each do |event|
      begin
        ExternalBus.send(event.payload)
        event.update!(status: "processed", processed_at: Time.current)
      rescue Faraday::ConnectionFailed, Faraday::TimeoutError
        event.increment!(:retry_count)
        if event.retry_count >= MAX_RETRIES
          event.update!(status: "failed")
          DeadLetterQueue.add(event)
        end
      end
    end
  end
end
```

| Property | Detail |
|---|---|
| Event written **inside** the business transaction | Atomicity |
| Forwarder is async + idempotent | Safe to retry |
| Dead-letter for terminal failures | Operator triage |
| Pair with CDC (Debezium) on the outbox table | Sub-second latency without polling |

> See [cdc_debezium_*.md](../../data_engineering/cdc_debezium_change_data_capture_wal_outbox.md) for the outbox + CDC combination.

**Related patterns — when to pick which:**

| Pattern | Use when |
|---|---|
| **Store-and-forward (SAF)** | Local node needs to keep operating during outage; upload later |
| **Outbox** | Atomic write + async fan-out from a service |
| **Write-ahead log (WAL)** | Durability before applying state change (DB internals) |
| **Dead-letter queue** | Where messages go after exhausting retries |
| **Hinted handoff** (Cassandra-style) | Peer holds writes for a temporarily-down node |
| **Event sourcing** | Every state change as an event; consumers replay |
| **Bulkhead / circuit breaker** | Failure isolation and fail-fast — different concern |
| **Tee / mirror** | Replicate side-effects without retry semantics |

**Forwarder retry strategy:**

| Concern | Detail |
|---|---|
| Exponential backoff + jitter | Prevent thundering herd on reconnect |
| Per-item retry counter | Cap before dead-letter |
| Idempotency key | Required — upstream must dedupe |
| Order preservation | FIFO unless upstream tolerates reordering |
| Parallel forwarders (sharded by key) | Scale upload throughput post-outage |
| Shutdown guarantee | Drain queue cleanly before shutdown |

**Replay & ordering — what you must decide up front:**

| Decision | Options |
|---|---|
| Strict FIFO upstream | Single forwarder; sequential upload |
| Per-key FIFO | Shard by key; preserve order within a key (Kafka-style) |
| Best-effort | Parallel upload; reorder OK |
| Time-window grouping | Batch by minute / hour |

**Dead-letter handling:**

| Reason for DLQ | Operator response |
|---|---|
| Upstream rejected payload (4xx) | Fix payload + replay from DLQ |
| Upstream had bug (5xx for too long) | Wait + retry from DLQ |
| Risk threshold exceeded (offline limit) | Manual review; possibly refund |
| Schema mismatch | Migrate data, re-publish |
| Auth / cred expired | Rotate + replay |

**Operational signals — what to monitor:**

| Metric | Healthy |
|---|---|
| Queue depth | Bounded; alert if growing |
| Age of oldest item | Within retention window |
| Upload success rate | > 99% steady state |
| Forwarder latency | Within target |
| DLQ depth | Near 0; alert on growth |
| Retry count distribution | Most items retried 0 times |
| Disk usage | Headroom for max-queue-depth × payload-size |

**Recovery scenarios:**

| Failure | Recovery |
|---|---|
| Power loss mid-write | Local store fsync ensures the entry survives |
| Forwarder crash mid-upload | In-flight rolls back to "eligible"; idempotency key prevents duplicate |
| Upstream returns ambiguous timeout | Retry with same idempotency key; upstream dedupe handles it |
| Dead-letter accumulates | Triage process: replay or discard with audit trail |
| Disk full | Reject new transactions or shed older items per policy |
| Clock skew (terminal time wrong) | Store both local-time and server-time at upload |
| Long offline period (days) | Items beyond max-age are auto-expired; user notified |

**Storage choices for the local queue:**

| Store | Use when |
|---|---|
| Embedded SQLite | App on a device; durability + simple queries |
| RocksDB / LevelDB | Higher throughput; lots of writes |
| Append-only log file | Simple, fast, manual indexing |
| Per-tenant table in shared DB | Server-side outbox |
| In-memory + periodic snapshot | If cost of loss-on-crash is acceptable (rare) |
| Cloud queue (SQS / Pub-Sub) | When the "local" is a server with cloud connectivity |

**Cross-cutting concerns:**

| Concern | Pattern |
|---|---|
| **Schema evolution** | Version each payload; forwarder reads version on replay |
| **Encryption at rest** | Store encrypted (KMS / device keystore) |
| **Tamper-evidence** | HMAC each entry; verify before upload |
| **Privacy / retention** | Auto-purge after N days even if uploaded |
| **Multi-tenant** | One queue per tenant or per device |
| **Compression** | Useful for batched uploads after long outage |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| No idempotency key on uploads | Reconnect → duplicate transactions |
| FIFO order broken | Out-of-order replay confuses upstream state machines |
| No max queue depth | Disk fills, terminal becomes useless |
| No max transaction age | Stale data uploaded after relevance window |
| No DLQ | Failed items silently retried forever |
| Forwarder lacks backpressure | Burst on reconnect overwhelms upstream |
| In-memory queue claiming durability | Crash loses data |
| Risk caps not enforced when offline | Fraud exposure |
| Status not surfaced to user / merchant | They don't know transactions are queued |
| Dual-write outside a transaction | Local + remote drift on partial failure |

**Decision matrix:**

| Need | Pick |
|---|---|
| POS / payment terminal must work offline | SAF with risk caps + per-card velocity |
| Service emits events to external bus | Outbox + idempotent forwarder |
| Mobile app makes API calls offline | Local queue + sync on connect |
| Sensor / IoT device with intermittent connectivity | SAF with data compression for bulk upload |
| Pure resilience (no offline operation) | Retry + circuit breaker, not SAF |

**Rule of thumb:** any system that **must keep operating during connectivity loss** needs a **local durable FIFO queue**. Pair with **idempotency keys** (so reconnect doesn't duplicate), **max queue depth + max age** (so risk is bounded), **dead-letter queue** (so failed items don't block forever), and **risk caps** (so SAF availability doesn't become a fraud vector). The same pattern is the **outbox** when "local" means "your service".
