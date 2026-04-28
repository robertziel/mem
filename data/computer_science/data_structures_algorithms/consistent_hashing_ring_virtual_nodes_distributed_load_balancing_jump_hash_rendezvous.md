### Consistent Hashing (ring, virtual nodes, distributed load balancing, jump hash, rendezvous)

**When:** distribute keys across `N` nodes such that adding / removing a node moves only `~K/N` keys instead of `K`. Used for: distributed caches (Memcached, Redis Cluster), DHTs (Cassandra, Dynamo), CDN routing, sharded databases, load balancers.

**The problem with `hash(key) % N`:**

When `N` changes, **almost every key's destination shifts** (`hash % old_N ≠ hash % new_N`). Cache misses go to ~100%. Catastrophic on resize.

#### Schema (ring-based consistent hashing)

| Concept | Detail |
|---|---|
| Hash ring | The output range of a hash, conceptually wrapped into a circle |
| Node placement | Each physical node placed at one (or many) point(s) on the ring via `hash(node_id)` |
| Key placement | Key `k` → `hash(k)` → walk **clockwise** to the next node |
| Add node | Only keys whose successor changed move (~K/N) |
| Remove node | Its keys move to the next clockwise node (~K/N) |
| Virtual nodes | Each physical node owns many ring positions to smooth load variance |

#### Implementation

```python
import bisect, hashlib

class ConsistentHash:
    def __init__(self, vnodes_per_node=150):
        self.vn = vnodes_per_node
        self.ring = []                           # sorted hash positions
        self.pos_to_node = {}                    # hash → node id

    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node):
        for i in range(self.vn):
            h = self._hash(f"{node}#{i}")
            bisect.insort(self.ring, h)
            self.pos_to_node[h] = node

    def remove_node(self, node):
        new_ring = []
        for h in self.ring:
            if self.pos_to_node[h] != node: new_ring.append(h)
            else: del self.pos_to_node[h]
        self.ring = new_ring

    def get_node(self, key):
        if not self.ring: return None
        h = self._hash(key)
        i = bisect.bisect_right(self.ring, h)
        if i == len(self.ring): i = 0            # wrap around
        return self.pos_to_node[self.ring[i]]
```

> **Virtual nodes (replicas) per physical node** smooth out load variance. With `~150` vnodes, load distribution gets close to uniform.

#### Why virtual nodes matter

Without vnodes, with `N` nodes placed at random ring positions, the **maximum-load node** has variance proportional to `O(log N / N)` — bad for small `N`. With `V` vnodes per node, variance shrinks like `O(1 / √(V · N))`.

| Vnodes per node | Load variance |
|---|---|
| 1 | High — some nodes 2–3× more loaded |
| 50 | Acceptable |
| 150 (Cassandra default) | Smooth |
| 1000 | Diminishing return |

#### Variants — non-ring approaches

| Algorithm | Use | Notes |
|---|---|---|
| **Jump hash** (Lamping & Veach) | `bucket = (key, num_buckets) → 0..num_buckets−1` | O(log N), no memory, **only adds nodes at the end** (no removal) |
| **Rendezvous (HRW)** hashing | For each key, compute `hash(key, node)` for all nodes; pick max | O(N) per lookup, but **no rebalancing needed** when nodes change |
| **Maglev hashing** | Permutation table per node; lookup = O(1) | Used by Google Maglev load balancer; supports node failure with minimal disruption |
| **Anchor / multiprobe** | More even distribution at low memory cost | Modern variants |

#### Jump consistent hash

```python
def jump_hash(key, num_buckets):
    b, j = -1, 0
    while j < num_buckets:
        b = j
        key = (key * 2862933555777941757 + 1) & ((1 << 64) - 1)
        j = int((b + 1) * ((1 << 31) / ((key >> 33) + 1)))
    return b
```

> Returns a bucket index in `[0, num_buckets)` for a 64-bit key. **Only valid when buckets are added/removed at the high-numbered end** — not for arbitrary node failure.

#### Rendezvous (HRW)

```python
def rendezvous(key, nodes, hash_fn=hash):
    return max(nodes, key=lambda n: hash_fn(f"{n}:{key}"))
```

> Trivial to implement; lookup is **O(N)**. Each key's destination depends only on the surviving nodes — automatic rebalancing.

#### Patterns map

| System | Algorithm |
|---|---|
| Memcached client (Ketama) | Ring with ~160 vnodes |
| Cassandra | Token ring with vnodes |
| Riak / Dynamo | Ring + virtual nodes |
| Redis Cluster | 16384 hash slots, manual assignment |
| Akamai CDN | Consistent hashing for cache placement |
| Google Maglev (load balancer) | Maglev hash |
| Discord channels → shards | Jump hash |
| GFS / HDFS chunk placement | Rendezvous-like with replication |
| Sharded databases | Ring or jump hash |
| ML serving — model → server | Rendezvous |

#### Replication on the ring

To replicate each key onto `R` nodes: walk the ring **clockwise**, take the next `R` distinct **physical** nodes (skip vnodes that map back to the same physical node).

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using `hash % N` and surprised by cache miss storm on resize | That's why consistent hashing exists |
| Too few vnodes per node | Imbalanced load — use 100+ |
| Bad hash function (poor uniformity) | Use MD5 / xxHash / MurmurHash |
| Jump hash on arbitrary node removal | Doesn't support — only growth at end |
| Rendezvous with N huge (1000s) | O(N) per lookup; switch to ring |
| Not replicating across distinct physical nodes | Replicas all on one machine = no fault tolerance |
| Hot keys despite consistent hashing | Consistent hashing balances **uniform** keys; hot keys still need separate caching layer |
| Virtual nodes stored as full data structures | Just store positions and node ID; don't duplicate per-node state |

#### Complexity

| Op | Ring | Jump hash | Rendezvous |
|---|---|---|---|
| Lookup | O(log(V·N)) | O(log N) | O(N) |
| Add node | O(V) | O(1) (only end) | O(0) |
| Remove node | O(V) | Not supported | O(0) |
| Memory | O(V·N) | O(0) | O(N) |
| Load uniformity | Good with V ≥ 100 | Excellent | Excellent |

**Rule of thumb:** **Ring with virtual nodes** is the production default — log lookup, smooth load, easy rebalance. Use **jump hash** for "cluster grows but doesn't shrink in the middle" (Discord shards). Use **rendezvous (HRW)** for **small N with no rebalancing logic**. Always **replicate to distinct physical nodes**, not just distinct vnodes.
