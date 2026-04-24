### RabbitMQ vs Redis as Celery Broker

**Short answer:**
- **RabbitMQ** is the safer default for production Celery brokers
- **Redis** is simpler to run and fine for many small/medium workloads
- Very common combo: **RabbitMQ as broker**, **Redis as result backend**

**Broker URLs:**
```python
broker_rabbitmq = "pyamqp://guest:guest@localhost//"
broker_redis = "redis://localhost:6379/0"
result_backend = "redis://localhost:6379/1"
```

**Comparison table:**
| Topic | RabbitMQ | Redis |
|------|----------|-------|
| Celery status | Stable | Stable |
| Best at | Reliable task delivery, routing, durable queues | Simple setup, fast small-message transport |
| Message size | Handles larger messages better | Large messages can congest system |
| Routing | Rich AMQP exchanges + routing keys | Simpler queue semantics |
| Durability | Stronger default choice for production brokering | More susceptible to loss on abrupt termination/power failure |
| Long ETA/countdown caveat | No Redis visibility-timeout caveat | Visibility timeout matters; redelivery can surprise you |
| Ops simplicity | More moving parts / AMQP concepts | Easiest if you already run Redis |
| Result backend fit | `rpc://` exists but not ideal for long-term results | Very common result backend |

**Choose RabbitMQ when:**
- Task loss is unacceptable
- You want durable queues and explicit acknowledgments
- You need better routing: exchanges, bindings, routing keys
- You have mixed workloads and want clearer broker semantics
- Tasks can be larger or queue behavior matters more than setup simplicity

**Choose Redis when:**
- You already operate Redis and want minimal infrastructure
- Tasks are small, frequent, and operational simplicity matters most
- You do not need rich AMQP routing features
- You want a good enough broker for internal apps, prototypes, or moderate workloads

**Important Redis broker caveat: visibility timeout**
- Redis broker uses a **visibility timeout**
- If a task is not acknowledged before the timeout, Celery may redeliver it
- Default visibility timeout is **1 hour**
- Increasing it helps long-running / long-countdown tasks, but delays recovery of truly lost tasks

```python
app.conf.broker_transport_options = {
    "visibility_timeout": 43200  # 12 hours
}
```

**Why this matters:**
- A long-running task can be executed twice if it exceeds the timeout
- A far-future ETA/countdown task can behave badly if you treat the broker like a scheduler
- Idempotent tasks are mandatory either way, but especially important with Redis broker

**Popular production setup:**
```python
from celery import Celery

app = Celery(
    "myapp",
    broker="pyamqp://guest:guest@localhost//",
    backend="redis://localhost:6379/0",
)
```

**Why this combo is popular:**
- RabbitMQ handles brokering/delivery well
- Redis is fast and convenient for task state / results
- Each tool is used for what it is best at

**Practical guidance:**
- If you are unsure, start with **RabbitMQ broker + Redis backend**
- If the team already runs Redis and wants the fewest moving parts, Redis broker is reasonable
- Keep tasks small, pass IDs not blobs, and make every task idempotent
- Do not rely on the broker for distant-future scheduling; use Celery Beat or DB-backed scheduling

**Gotcha:** Redis as a **broker** and Redis as a **result backend** are different concerns. Redis is often great as a result backend even when RabbitMQ is the better broker choice.

**Rule of thumb:** For Celery, RabbitMQ is the more production-oriented broker. Redis is the simpler broker. Use RabbitMQ when delivery semantics and routing matter most; use Redis when operational simplicity and small-message throughput matter more.
