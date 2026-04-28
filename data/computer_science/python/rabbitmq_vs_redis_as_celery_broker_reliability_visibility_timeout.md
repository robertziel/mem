### RabbitMQ vs Redis as Celery Broker

**Short answer:** **RabbitMQ** is the more production-oriented broker (durable queues, AMQP routing, explicit ACKs); **Redis** is simpler operationally and fine for most small/medium workloads, **but** has the **visibility-timeout caveat**. Common compromise: **RabbitMQ broker + Redis result backend**.

**Side-by-side comparison:**

| Topic | **RabbitMQ** | **Redis** |
|---|---|---|
| Celery support | Stable | Stable |
| Best at | Reliable delivery, durable queues, rich routing | Simple setup, fast small-message transport |
| Message size | Large messages OK | Large messages can congest |
| Routing | AMQP exchanges + bindings + routing keys | Simpler queue semantics (LPUSH/BRPOP) |
| Durability | Stronger by default | Weaker (depends on persistence config) |
| Acknowledgments | Explicit, robust | Visibility-timeout based |
| Long ETA / countdown | OK | **Caveat — see below** |
| Ops simplicity | More moving parts (AMQP concepts) | Easiest if you already run Redis |
| As result backend | `rpc://` exists, but not ideal | **Very common as result backend** |

**Broker URLs:**

```python
# RabbitMQ
broker = "pyamqp://guest:guest@rabbit:5672//"

# Redis
broker = "redis://redis:6379/0"

# Result backend (often Redis even with RabbitMQ broker)
result_backend = "redis://redis:6379/1"
```

**Pick RabbitMQ when:**

| Need | Detail |
|---|---|
| Task loss is unacceptable | Durable queues, persistent messages |
| Want explicit acknowledgments | ACK after success, reject on failure |
| Need rich routing | Topic / direct / fanout exchanges |
| Mixed workloads | Multiple queues with different priorities |
| Larger task payloads | Doesn't congest the broker |
| Multi-tenant routing | AMQP virtual hosts |
| Future of long ETA tasks | No visibility-timeout caveat |

**Pick Redis when:**

| Need | Detail |
|---|---|
| Already run Redis | Minimal new infra |
| Tasks small + frequent | High throughput |
| No need for AMQP routing | Simple queue suffices |
| Operational simplicity is priority | Single tool |
| Internal tools / prototypes | Plenty good enough |
| Tasks short-lived (< visibility timeout) | Avoids the caveat |

**The Redis broker visibility-timeout caveat (must understand):**

```
T0: Worker dequeues task with visibility timeout = 1 hour
T1 (after 30 min): Task still running
T2 (after 1 hour): Visibility timeout expires → Celery thinks task lost → REDELIVERED to another worker
T3 (after 1.5h): Original worker finishes → task ALSO ran on second worker
```

| Property | Detail |
|---|---|
| Default visibility timeout | **1 hour** |
| Long-running task > timeout | Will be redelivered (executed twice) |
| Long ETA / countdown task > timeout | Will be redelivered before its scheduled time |
| Mitigation | Increase `visibility_timeout` |
| Side effect of higher timeout | Slower recovery from genuinely lost tasks |
| **Idempotency mandatory** | All Celery tasks should be idempotent, but doubly so with Redis |

**Tuning visibility timeout:**

```python
app.conf.broker_transport_options = {
    "visibility_timeout": 43200    # 12 hours
}
```

| Setting | Trade-off |
|---|---|
| Default 1 hour | Fast recovery, fails for long tasks |
| 12 hours | Fits long tasks, slow recovery from lost workers |
| Don't use as a scheduler | Use Celery Beat or DB-backed schedule for far-future ETAs |

**RabbitMQ — no equivalent caveat:**

| Mechanism | Detail |
|---|---|
| Explicit ACK / NACK | Message stays "unacknowledged" indefinitely |
| Worker crash → message returns to queue | Automatic |
| Dead-letter exchange for repeatedly failed | Standard pattern |
| No timeout-based redelivery | Long tasks safe |

**Popular production setup:**

```python
from celery import Celery

app = Celery(
    "myapp",
    broker="pyamqp://guest:guest@rabbit:5672//",     # reliability
    backend="redis://redis:6379/0",                   # results
)

app.conf.update(
    task_acks_late=True,                              # ack after success only
    task_reject_on_worker_lost=True,                  # requeue on worker death
    task_track_started=True,                          # state visibility
    worker_prefetch_multiplier=1,                     # fairness for long tasks
)
```

**Why RabbitMQ broker + Redis backend is popular:**

| Tool | Why used |
|---|---|
| RabbitMQ as broker | Reliable delivery, ACK semantics |
| Redis as result backend | Fast, common, well-understood |
| Each tool used for what it's best at | Right tool, right job |

**Result backend options:**

| Backend | Pros | Cons |
|---|---|---|
| **Redis** | Fast, common, rich data types | Volatile if no persistence |
| **Postgres / MySQL** | Durable, queryable | Slow under load |
| **RPC** (over RabbitMQ) | Same broker | Not great for long-term storage |
| **S3** | Cheap for large results | Slow |
| **None** | Don't need results | Fire-and-forget tasks |

**Operational checklist:**

| Concern | RabbitMQ | Redis |
|---|---|---|
| HA setup | Mirror queues / quorum queues | Sentinel / Cluster |
| Persistence on broker host | Disk-backed; tunable | RDB + AOF |
| Monitoring | Management UI, Prometheus exporter | Redis INFO, exporter |
| Dead-letter handling | Dead-letter exchange | DIY logic |
| Connection management | AMQP heartbeats | Connection pool |
| Backpressure | Channel-level | Memory-based eviction risk |

**Task design — best practices regardless of broker:**

| Practice | Detail |
|---|---|
| **Idempotent tasks** | Safe to retry / re-execute |
| **Pass IDs, not blobs** | Reference data in DB, not in message |
| **Short tasks if possible** | Easier recovery |
| **Tag tasks with retry policy** | `retry_backoff=True, max_retries=5` |
| **Bound execution time** | `time_limit`, `soft_time_limit` |
| **Logging + tracing** | Track task lifecycle |
| **Use Beat for scheduling, not broker timing** | Cron-like reliability |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Long-running task on Redis broker | Double execution after visibility timeout |
| Far-future ETA on Redis broker | Same — fires + redelivers |
| Tasks not idempotent | Double-execution corrupts state |
| Result backend = same Redis as broker | Memory pressure |
| Massive payload in task message | Network + broker pressure |
| No DLQ / failed-task handling | Failures swallowed |
| `task_acks_late=False` (default) | Worker crash = task lost |
| `worker_prefetch_multiplier=4` (default) for long tasks | Hoards tasks, slow recovery |

**Decision matrix:**

| Scenario | Pick |
|---|---|
| New project, small/medium scale, already use Redis | Redis broker |
| Production-grade, durability matters | RabbitMQ broker |
| Long-running tasks (> 1h) | **RabbitMQ** (or Redis with high visibility_timeout) |
| Mixed task priorities, complex routing | RabbitMQ |
| Best-of-both | RabbitMQ broker + Redis result backend |
| Cloud-managed | AWS SQS, Google Pub/Sub (also Celery-supported) |

**Cross-references:**

- Celery / async task patterns: [celery_*.md](celery_async_tasks_python_workers.md)
- Distributed locks (related): [distributed_locks_*.md](../distributed_systems/distributed_locks_redis_redlock_fencing_token.md)
- Idempotency keys: [idempotency_*.md](../distributed_systems/idempotency_key_exactly_once_deduplication.md)
- Background jobs (Sidekiq comparison): [sidekiq_*.md](../ruby/rails/jobs/sidekiq_active_job_threading.md)

**Rule of thumb:** **For Celery, RabbitMQ is the more production-oriented broker; Redis is simpler but has the visibility-timeout caveat.** Default **idempotent tasks + small payloads (IDs not blobs)**. **RabbitMQ broker + Redis result backend** is the common compromise. Don't rely on the broker for **far-future scheduling** — use Celery Beat or DB-backed schedules. Tune visibility timeout to your **longest task duration**.
