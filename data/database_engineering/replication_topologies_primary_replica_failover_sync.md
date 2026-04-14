### Database Replication Topologies

**Why replicate:**
- High availability (failover if primary dies)
- Read scaling (distribute reads across replicas)
- Geographic distribution (reduce latency for global users)
- Disaster recovery (cross-region backup)

**Single-leader (primary-replica):**
```
Writes -> [Primary] --async replication--> [Replica 1]
Reads  -> [Primary] or [Replica 1]    --> [Replica 2]
```
- One node accepts writes, replicates to followers
- Replicas serve reads (eventually consistent)
- Failover: promote a replica to primary
- Most common: PostgreSQL, MySQL, RDS

**Synchronous vs asynchronous replication:**
| Mode | Behavior | Tradeoff |
|------|----------|----------|
| Sync | Primary waits for replica ACK | No data loss, higher latency |
| Async | Primary doesn't wait | Lower latency, potential data loss |
| Semi-sync | Wait for 1 of N replicas | Balance of safety and latency |

**Replication lag:**
- Async replicas may be seconds behind primary
- Problems: read-your-writes inconsistency, stale reads
- Mitigations: read from primary after writes, causal consistency tokens

**Multi-leader (multi-master):**
```
[Leader A] <--sync/async--> [Leader B]
   |                           |
[Replica A1]             [Replica B1]
```
- Multiple nodes accept writes
- Use for: multi-region setups, offline-capable clients
- Challenge: write conflicts (same row updated on both leaders)
- Conflict resolution: LWW, custom merge logic, CRDTs
- Examples: CockroachDB, Galera Cluster, DynamoDB Global Tables

**Leaderless (Dynamo-style):**
```
Client writes to N nodes, reads from N nodes
Quorum: W + R > N (e.g., N=3, W=2, R=2)
```
- No single leader, any node accepts reads and writes
- Quorum-based consistency
- Anti-entropy: background process syncs diverged replicas
- Read repair: on read, fix stale replicas
- Examples: Cassandra, DynamoDB, Riak

**Failover (single-leader):**
1. Detect primary failure (heartbeat timeout)
2. Choose new primary (most up-to-date replica)
3. Reconfigure replicas to follow new primary
4. Update clients/routing to new primary

**Failover challenges:**
- Data loss if async replica is behind
- Split-brain: old primary comes back, both think they're primary
- Cascading failures during failover
- Managed services (RDS Multi-AZ) handle this automatically

**Replication methods:**
- **Statement-based** - replicate SQL statements (non-deterministic functions cause issues)
- **WAL (Write-Ahead Log)** - ship binary log of changes (PostgreSQL, MySQL binlog)
- **Logical replication** - row-level changes in logical format (cross-version compatible)

**Rule of thumb:** Single-leader for most applications (simplest). Multi-leader for multi-region writes. Leaderless for extreme write availability. Use managed services (RDS Multi-AZ) to handle failover complexity. Always monitor replication lag.
