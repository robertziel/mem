### Distributed Locks — Redis, Redlock, Fencing Tokens

**Definition:** a **distributed lock** gives one process exclusive access to a shared resource across machines. Local mutexes don't work; you need an out-of-process coordinator (Redis, etcd, ZooKeeper). Beware: distributed locks are **inherently shaky** under network partitions and process pauses — prefer **idempotency** when possible.

**The problem:**

| Single-process | Distributed |
|---|---|
| `mutex.lock()` works | No — no shared memory |
| Easy semantics | Network can fail / partition |
| No partial failure | Lock holder may be GC-paused |
| `try / finally` releases reliably | Lock holder may crash mid-section |

**Three real options:**

| Tool | Mechanism | Strength | Latency |
|---|---|---|---|
| **Redis** (single node) | `SET NX EX` | Best-effort, cheap | < 1ms |
| **Redis Redlock** (multi-node) | Quorum on N nodes | Stronger but **controversial** | Few ms |
| **etcd / ZooKeeper** | Consensus (Raft / ZAB) | Strong consistency | Tens of ms |

**Redis single-node lock — the basic recipe:**

```python
import uuid

lock_value = str(uuid.uuid4())   # unique per acquirer
acquired = redis.set("lock:order:123", lock_value, nx=True, ex=30)

if acquired:
    try:
        do_critical_work()
    finally:
        # Atomic check-and-delete via Lua
        release_script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
          return redis.call('del', KEYS[1])
        else
          return 0
        end
        """
        redis.eval(release_script, 1, "lock:order:123", lock_value)
```

| Step | Why |
|---|---|
| `SET NX` | Atomic acquire (fails if already held) |
| `EX 30` | Auto-expire — if holder crashes, lock unjams |
| Unique value | Identify the holder |
| Lua release | Atomic check-then-delete (prevents releasing someone else's lock) |
| `try / finally` | Best-effort release |

**Why the unique value matters:**

```
Without unique value:
  Client A acquires lock, takes 35s (longer than EX 30)
  Lock auto-expires
  Client B acquires lock
  Client A finishes, calls DEL → deletes B's lock!
  → Two clients now think they hold the lock
```

| Defense | Detail |
|---|---|
| Compare value before delete | Only holder can release |
| Lua atomic | Otherwise check-and-delete has TOCTOU race |
| Increase EX longer than worst-case work | But you can't reliably know the upper bound |

**The fundamental fencing-token problem:**

```
T1: Client A acquires lock (token = 33)
T2: Client A is paused (long GC, network freeze)
T3: Lock TTL expires
T4: Client B acquires lock (token = 34)
T5: Client B writes to resource (token 34)
T6: Client A wakes up, writes to resource (token 33)
T7: Resource now has stale write from A
```

| Defense | Detail |
|---|---|
| **Fencing token** | Monotonically increasing token per acquisition |
| Resource validates token on each operation | Reject if token < latest seen |
| Provided by ZooKeeper / etcd lease epoch | Built-in |
| **Redis does NOT provide fencing tokens** | Major Kleppmann critique |

**Fencing in practice:**

```
Storage operation:
  if request.token >= storage.last_token:
    storage.last_token = request.token
    apply(request)
  else:
    reject (stale token)
```

> Fencing tokens are how you make distributed locks safe under pauses. **The resource must enforce the fence**, not the lock service.

**Redlock (multi-node Redis) — the controversy:**

| Property | Detail |
|---|---|
| Acquire on **N/2 + 1** of N independent Redis nodes | Quorum |
| Each node has independent TTL | Same lock key |
| Considered held if majority succeed within timeout | Best-effort |
| **Martin Kleppmann's critique (2016)** | Not safe under clock drift / GC pauses; no fencing token |
| Antirez's response | Pragmatic concession: it's for efficiency, not correctness |
| Industry consensus | OK for **efficiency** (avoid duplicate work); **not** for correctness-critical |

**etcd / ZooKeeper — when correctness matters:**

| Property | Detail |
|---|---|
| Based on **consensus protocol** (Raft / ZAB) | Survives partitions |
| Lease-based locks | TTL with heartbeat renewal |
| Watch mechanism | Notified when lock released |
| Fencing tokens (epoch / revision) | Built-in |
| Higher latency | Tens of ms |
| Stronger guarantees | Linearizable |
| Use cases | Leader election, config coordination, schema migrations |

**Decision matrix — do you actually need a lock?**

| Scenario | Best fit |
|---|---|
| Prevent duplicate job execution | **Idempotency key** > lock |
| Inventory reservation | **DB row lock** or optimistic version |
| Leader election (one writer) | **etcd / ZooKeeper lease** |
| Avoiding redundant work (cron job dedup) | Redis lock (efficiency) |
| Single-tenant resource (file processing) | Redis lock (efficiency) |
| Money transfer | DB transaction + isolation |
| Rate limiting | **Token bucket** — no lock needed |
| Unique constraint | **DB unique index** — no lock needed |

**Idempotency vs locking — prefer idempotency:**

| With lock | With idempotency |
|---|---|
| Lock to prevent duplicate processing | Just process; dedupe by ID |
| Network failure mid-section is unsafe | Retries are safe |
| Need TTL guesses | No timing concerns |
| Single point of failure | Distributed-friendly |
| Locks complicate retries | Retries are the model |

**Best practices for distributed locks:**

| Practice | Why |
|---|---|
| **Always set a TTL** | Prevent deadlock if holder crashes |
| **Keep critical section short** | Less risk of pause / partition |
| **Use unique owner IDs** | Don't release someone else's lock |
| **Use Lua for release** | Atomic check-then-delete |
| **Add fencing tokens at the resource** | Survive process pauses |
| **Prefer idempotency** | Locks are last resort |
| **Consider auto-extending the lease** | Heartbeat for long work |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| No TTL — holder crashes | Permanent deadlock |
| TTL too short — work takes longer | Lock expires mid-section |
| TTL too long — holder crashes | Long wait to recover |
| No unique value — release by anyone | Lock released by another client |
| Sync clock differences | Multi-node Redis quorum unreliable |
| GC pause / network freeze | Holder thinks it still has lock |
| Using Redis locks for money | Wrong tool — use DB transactions + fencing |
| Forgetting to renew long-running lease | Released mid-job |
| Believing single-node Redis is HA | Sentinel / Cluster recovery has races |
| Mixing lock and non-lock paths | One unguarded path negates the lock |

**Code pattern: lease + heartbeat for long work:**

```python
import threading

acquired = redis.set(key, owner, nx=True, ex=30)
if not acquired:
    return

stop = threading.Event()

def heartbeat():
    while not stop.is_set():
        redis.expire(key, 30)   # only if we still own it (better: Lua)
        stop.wait(10)

t = threading.Thread(target=heartbeat, daemon=True)
t.start()

try:
    do_long_work()
finally:
    stop.set()
    t.join()
    release_lock(key, owner)
```

**Decision matrix (final):**

| Need | Pick |
|---|---|
| Best-effort dedup | Redis single-node `SET NX EX` |
| Efficiency lock across multiple Redises | Redlock (with caveats) |
| Correctness-critical leader election | etcd / ZooKeeper |
| Money / inventory | DB transactions + optimistic version + fencing |
| Unique-only-once constraint | DB unique index |
| At-least-once + dedupe | Idempotency key |

**Cross-references:**

- Idempotency keys: [idempotency_*.md](idempotency_key_exactly_once_deduplication.md)
- Optimistic vs pessimistic locking (DB): [locking_*.md](../database_engineering/postgresql/locking_optimistic_vs_pessimistic.md)
- Consensus / Raft: [consensus_raft_*.md](consensus_raft_paxos_leader_election.md)
- CRDTs (lock-free convergence): [eventual_consistency_*.md](eventual_consistency_crdts_lww_conflict_resolution.md)

**Rule of thumb:** **Prefer idempotency over distributed locks.** When you must lock, use **Redis `SET NX EX` + Lua release** for **efficiency** (preventing duplicate work) and **etcd / ZooKeeper** for **correctness** (leader election, schema coordination). **Redis Redlock is fine for efficiency, not correctness** — it lacks fencing tokens. Always set a **TTL**, **unique owner ID**, **short critical section**, and add **fencing at the resource** to survive GC pauses.
