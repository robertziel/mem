### System Design: Distributed Cache

**Requirements:**
- Low-latency key-value lookups (sub-millisecond)
- Horizontal scaling (add nodes to increase capacity)
- High availability (no single point of failure)
- Eviction policies when memory is full

**Architecture:**
```
App Servers -> Cache Client (with consistent hashing) -> Cache Cluster
               [hash(key) -> node]                       [Node 1] [Node 2] [Node 3]
```

**Consistent hashing:**
- Hash ring: nodes and keys mapped to positions on a circle
- Key is stored on the first node clockwise from its hash position
- Add/remove node: only ~1/N keys need to move
- Virtual nodes: each physical node has multiple positions (better distribution)

```
Hash ring:  0 ----[N1]----[N2]----[N3]---- MAX
Key "foo" hashes to position between N2 and N3 -> stored on N3
Remove N3 -> keys move to N1 (next clockwise), not all reshuffle
```

**Replication:**
- Store each key on K consecutive nodes (e.g., primary + 2 replicas)
- Read from nearest replica (low latency)
- Write to primary, async replicate (eventual consistency)
- Quorum: W + R > N for consistency (e.g., W=2, R=2, N=3)

**Cache partitioning strategies:**
| Strategy | How | Tradeoff |
|----------|-----|----------|
| Consistent hashing | Hash key to ring | Even distribution, minimal reshuffling |
| Hash slot (Redis Cluster) | 16384 slots mapped to nodes | Deterministic, Redis-native |
| Range partitioning | Key ranges to nodes | Range queries, risk of hotspots |

**Redis Cluster specifics:**
- 16384 hash slots distributed across nodes
- Multi-key operations must be in same slot (use hash tags: `{user:123}.profile`)
- Automatic failover: replica promoted if primary fails
- No cross-slot transactions

**Handling failures:**
- **Node down**: redirect to replica, promote replica to primary
- **Split brain**: use quorum-based leader election — Redis Sentinel uses its own quorum protocol (not Raft); Redis Cluster uses gossip + slot-ownership voting
- **Hot key**: replicate hot keys to all nodes, or use local caching layer

**Hot key problem:**
- One key gets disproportionate traffic (viral post, flash sale)
- Solutions:
  - Local cache on app server (L1 cache) with short TTL
  - Key replication: store on multiple nodes with suffix (`key:1`, `key:2`)
  - Read from replicas

**Cache warming:**
- Pre-populate cache on deploy or after failure
- Avoid cold-start thundering herd
- Strategies: batch load from DB, replicate from another cache node

**Rule of thumb:** Consistent hashing for even distribution. Replicate for availability. Local in-memory cache (L1) + distributed cache (L2) for hot keys. Plan for cache failure (circuit breaker, fallback to DB). Monitor hit rate (target > 95%).
