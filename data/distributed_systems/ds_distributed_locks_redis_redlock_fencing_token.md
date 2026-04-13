### Distributed Locks

**The problem:**
- Multiple processes/services need exclusive access to a resource
- Local mutexes don't work across processes or machines
- Examples: preventing double-processing a job, exclusive file access, leader election

**Redis distributed lock (Redlock concept):**
```
SET lock_key unique_value NX EX 30
# NX = only set if not exists (acquire lock)
# EX 30 = auto-expire after 30 seconds (safety net)
```

**Acquire:**
```python
lock_value = str(uuid4())  # unique per client
acquired = redis.set("lock:order:123", lock_value, nx=True, ex=30)
if acquired:
    try:
        do_critical_work()
    finally:
        release_lock("lock:order:123", lock_value)
```

**Release (must be atomic - check then delete):**
```lua
-- Redis Lua script (atomic)
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
end
return 0
```
- Only the lock holder can release (compare unique_value)
- Prevents releasing someone else's lock after your lock expired

**Lock pitfalls:**

**Fencing token problem:**
```
Client A acquires lock (token 1)
Client A pauses (GC, network delay)
Lock expires
Client B acquires lock (token 2)
Client A resumes, thinks it still holds lock
Both A and B operate on shared resource!
```
- Solution: fencing token (monotonically increasing) - resource rejects operations with old tokens

**Redlock algorithm (multi-node Redis):**
- Acquire lock on N/2+1 (majority) of N independent Redis nodes
- If majority acquired within timeout -> lock is held
- Controversial: Martin Kleppmann argues it's not safe for correctness-critical use
- Fine for efficiency (preventing duplicate work), not for correctness

**etcd/ZooKeeper locks (stronger guarantees):**
- Based on consensus protocol (Raft/ZAB)
- Lease-based: lock has a TTL, must be renewed (heartbeat)
- Watch mechanism: notified when lock is released
- Stronger than Redis but higher latency

**When to use distributed locks:**
| Scenario | Need lock? | Alternative |
|----------|-----------|-------------|
| Prevent double-processing | Yes | Idempotency key |
| Leader election | Yes | etcd/ZooKeeper lease |
| Rate limiting | No | Token bucket (no lock) |
| Unique constraint | No | Database unique index |
| Inventory reservation | Maybe | Optimistic locking (DB) |

**Best practices:**
- Always set a TTL (prevent deadlock if holder crashes)
- Keep lock duration short (do minimal work under lock)
- Use unique owner ID to prevent releasing someone else's lock
- Consider: do you really need a lock, or would idempotency work?

**Rule of thumb:** Prefer idempotency over locking when possible. Use Redis locks for efficiency (duplicate prevention). Use etcd/ZooKeeper locks for correctness (leader election). Always set TTL. Keep critical sections short.
