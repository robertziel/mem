### Celery + RabbitMQ Cheatsheet (Tasks, Workers, Retries, Queues, Beat)

**Component map:**

| Piece | Role | Common choice |
|---|---|---|
| Celery | Python task framework, defines tasks + workers | — |
| Broker | Stores + routes messages | RabbitMQ (default) |
| Result backend | Stores task return values (optional) | Redis |
| Beat | Cron-like periodic task scheduler | Run as a separate process |

**URLs:**

| Use | Example |
|---|---|
| Broker (RabbitMQ) | `amqp://guest:guest@localhost:5672//` |
| Result backend (Redis) | `redis://localhost:6379/0` |
| Result backend (DB) | `db+postgresql://user:pass@host/dbname` |
| Result backend (RPC, ephemeral) | `rpc://` |

**Task definition forms:**

| Form | Decorator + key options |
|---|---|
| Basic | `@app.task` |
| Retryable on specific exceptions | `@app.task(autoretry_for=(RequestException,), retry_backoff=True, retry_jitter=True, retry_kwargs={"max_retries": 5})` |
| Bound (access self / `self.retry()` manually) | `@app.task(bind=True)` |
| Idempotent / safe at-least-once | `@app.task(acks_late=True)` (worker ACKs after success — survive crashes; task must be idempotent) |
| Time-limited | `@app.task(time_limit=300, soft_time_limit=270)` |

**Calling tasks:**

| Call | Effect |
|---|---|
| `task.delay(*args, **kw)` | Send now, default queue |
| `task.apply_async(args=[...], countdown=10)` | Run 10s from now |
| `task.apply_async(args=[...], eta=datetime)` | Run at specific time |
| `task.apply_async(args=[...], queue="reports")` | Send to specific queue |
| `task.s(...)` | Build a *signature* (for chains/groups) |
| `chain(a.s(), b.s())()` | Run b after a, passing result |
| `group(a.s(), b.s(), c.s())()` | Run all in parallel, gather results |

**Queue routing:**

```python
app.conf.task_routes = {
    "tasks.send_email":       {"queue": "mailers"},
    "tasks.generate_report":  {"queue": "reports"},
}
```

**Worker invocation:**

| Command | Notes |
|---|---|
| `celery -A celery_app worker -l info` | Default — listens on `default` queue |
| `... worker -Q default,mailers` | Specific queues |
| `... worker --concurrency=4` | Pool size (prefork by default) |
| `... worker --pool=solo` / `gevent` / `eventlet` / `threads` | Switch executor (I/O-bound: gevent/threads; CPU-bound: prefork) |
| `celery -A celery_app beat -l info` | Periodic scheduler (separate process) |
| `celery -A celery_app inspect active` / `registered` / `status` | Live introspection |

**Task lifecycle states (return of `.state`):**

| State | Meaning |
|---|---|
| `PENDING` | Unknown — either not yet picked up, or backend doesn't know it |
| `STARTED` | Worker has it (only if `task_track_started=True`) |
| `RETRY` | Scheduled for retry |
| `SUCCESS` | Completed; result available |
| `FAILURE` | Exception raised |
| `REVOKED` | Cancelled |

**Periodic tasks (Beat):**

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    "nightly-cleanup": {
        "task": "tasks.cleanup_expired_sessions",
        "schedule": crontab(hour=2, minute=0),
    },
}
```

| Schedule type | Form |
|---|---|
| Every N seconds | `30.0` (raw float) |
| Cron | `crontab(hour=2, minute=0)` |
| Solar | `solar('sunset', lat, lon)` |

**Config knobs that bite (and what they do):**

| Setting | Default | When to change |
|---|---|---|
| `task_acks_late` | `False` | **`True` for any non-idempotent crash safety** — worker ACKs after task completes, so a crashed worker's task is redelivered |
| `worker_prefetch_multiplier` | `4` | **`1` for long-running tasks** — stops one worker hoarding queued jobs |
| `task_time_limit` | none | Hard SIGKILL after N seconds (no cleanup) |
| `task_soft_time_limit` | none | Raise `SoftTimeLimitExceeded` first — let the task clean up |
| `task_reject_on_worker_lost` | `False` | Pair with `acks_late=True` — requeue on worker loss |
| `result_expires` | `1d` | TTL on results in backend |
| `task_serializer` | `json` | Avoid `pickle` (RCE on untrusted input) |

**RabbitMQ concepts you actually need:**

| Concept | What it is |
|---|---|
| Exchange | Receives messages, routes them by routing key |
| Queue | Stores messages until consumed |
| Binding | Rule connecting an exchange to a queue |
| Routing key | String the exchange uses to pick the queue |
| Durable queue | Survives broker restart (use for production tasks) |
| ACK / NACK | Worker telling broker "done" / "redeliver this" |

**Production patterns:**

| Pattern | Why |
|---|---|
| One queue per workload class (`default`, `mailers`, `reports`, `cpu`) | Slow heavy queue can't starve fast cheap queue |
| Dedicated worker pool per queue | Independent scaling; isolated failure |
| Pass IDs / primitives, not ORM objects | Avoid stale state, payload bloat, serialization issues |
| Store blobs in S3 / object storage; pass key | Don't ship megabytes through the broker |
| Idempotent tasks (DB upsert / dedupe key) | Safe under `acks_late=True` redelivery |
| Beat as separate process (not `worker -B`) | Production reliability; only one Beat instance globally |

**Common gotchas:**

| Symptom | Likely cause |
|---|---|
| Task runs twice after worker crash | `acks_late=True` + non-idempotent task |
| One worker stalls a queue | High `worker_prefetch_multiplier` + long task |
| Task not registered | Module containing `@app.task` not imported by worker |
| `PENDING` forever | Task never reached broker, or backend can't see it |
| Memory growth in worker | Long-running with leaks — set `worker_max_tasks_per_child` to recycle |
| Pickle deserialization error | Producer/consumer mismatch on `task_serializer` |

**Rule of thumb:** **RabbitMQ for reliable delivery, Redis for results, idempotent tasks always.** Set `acks_late=True` + `worker_prefetch_multiplier=1` for crash safety on long jobs. Separate queues by workload class with dedicated workers. Pass IDs, not objects. Beat runs as its own process with exactly one instance.
