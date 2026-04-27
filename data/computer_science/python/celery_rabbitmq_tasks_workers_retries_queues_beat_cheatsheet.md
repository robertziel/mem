### Celery + RabbitMQ Cheatsheet

**What goes where:**
- **Celery** = Python task queue / worker framework
- **RabbitMQ** = broker that stores and routes messages
- **Result backend** = optional separate store for task results (`redis`, DB, RPC)
- Common setup: RabbitMQ as **broker**, Redis as **result backend**

**Install:**
```bash
pip install celery[rabbitmq] redis
```

**Broker / backend URLs:**
```python
broker = "amqp://guest:guest@localhost:5672//"
backend = "redis://localhost:6379/0"   # optional but common
```

**Minimal app setup:**
```python
# celery_app.py
from celery import Celery

app = Celery(
    "myapp",
    broker="amqp://guest:guest@localhost:5672//",
    backend="redis://localhost:6379/0",
)

app.conf.update(
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
```

**Basic task:**
```python
from celery_app import app

@app.task
def add(x, y):
    return x + y
```

**Call task:**
```python
add.delay(2, 3)                              # simplest
add.apply_async(args=[2, 3], countdown=10)  # run 10s later
add.apply_async(args=[2, 3], eta=None, queue="math")
```

**Retryable task:**
```python
import requests
from celery_app import app

@app.task(
    bind=True,
    autoretry_for=(requests.RequestException,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def fetch_url(self, url):
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.text[:200]
```

**Queue routing:**
```python
app.conf.task_routes = {
    "tasks.send_email": {"queue": "mailers"},
    "tasks.generate_report": {"queue": "reports"},
}
```

```python
send_email.apply_async(args=[user_id], queue="mailers")
generate_report.delay(report_id)   # auto-routed by task_routes
```

**Run workers:**
```bash
celery -A celery_app worker -l info
celery -A celery_app worker -l info -Q default,mailers
celery -A celery_app worker -l info --concurrency=4
```

**Periodic tasks (beat):**
```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    "cleanup-every-night": {
        "task": "tasks.cleanup_expired_sessions",
        "schedule": crontab(hour=2, minute=0),
    }
}
```

```bash
celery -A celery_app beat -l info
```

**Task states:**
- `PENDING` - not started / unknown to backend
- `STARTED` - worker picked it up
- `SUCCESS` - completed
- `FAILURE` - raised exception
- `RETRY` - scheduled to retry

**Useful config knobs:**
- `task_acks_late=True` -> ACK after work finishes; safer for crashes, requires idempotent tasks
- `worker_prefetch_multiplier=1` -> fairer task distribution for long jobs
- `task_time_limit=300` -> hard kill runaway jobs
- `task_soft_time_limit=270` -> raise exception before hard kill
- `result_expires=3600` -> auto-expire old results

**RabbitMQ concepts you actually need:**
- **Exchange** routes messages
- **Queue** stores messages until worker consumes them
- **Routing key** decides which queue gets the task
- **Durable queue** survives broker restart
- **ACK** tells RabbitMQ task finished successfully

**Monitoring / inspection:**
```bash
celery -A celery_app inspect active
celery -A celery_app inspect registered
celery -A celery_app status
celery -A celery_app report
```

**Common production patterns:**
- Separate queues by workload: `default`, `mailers`, `reports`, `cpu`
- Run dedicated workers per queue
- Keep tasks small and idempotent
- Pass IDs / primitive values, not ORM objects or huge payloads
- Store files in S3/object storage; pass object key to task

**Common gotchas:**
- RabbitMQ is a **broker**, not your long-term result store
- `task_acks_late=True` can re-run a task after worker crash -> task must be idempotent
- `worker_prefetch_multiplier > 1` can make one worker hoard long jobs
- `celery worker -B` is okay for local dev, not ideal for production
- If the module with `@app.task` is not imported, the worker will not register the task
- Long CPU-bound jobs should use a separate queue / worker pool

**Rule of thumb:** RabbitMQ for reliable task delivery, Celery for Python worker orchestration. Use RabbitMQ as broker, Redis as result backend, idempotent tasks, explicit queues, `acks_late`, and low prefetch for long-running jobs.
