### AWS DynamoDB (Partition Key, GSI/LSI, Streams, On-Demand)

**What it is:**

| Property | Value |
|---|---|
| Type | Fully-managed NoSQL — key-value + document |
| Latency | Single-digit ms at any scale |
| Capacity model | On-Demand or Provisioned (per-table) |
| Item size limit | 400 KB |
| Operational overhead | None — no servers, patching, or sizing on-demand |

**Core schema vocabulary:**

| Term | Meaning |
|---|---|
| **Table** | Collection of items |
| **Item** | One record (max 400 KB) |
| **Attribute** | Field on an item — schemaless except for PK/SK |
| **Partition key (PK)** | Required — `hash(PK)` selects the physical partition |
| **Sort key (SK)** | Optional — items with same PK ordered by SK; enables range queries within a partition |
| **Composite primary key** | (PK + SK) — uniqueness is the pair |

**The single most important rule: design for access patterns.** Unlike SQL, you don't normalize first; you list every query the app needs and shape the schema to answer them in 1 request.

| Question | PK / SK strategy |
|---|---|
| "Get all orders for user U" | PK: `user_id`, SK: `order_date` |
| "Get order by ID" | GSI with PK: `order_id` |
| "Get recent orders by status" | GSI with PK: `status`, SK: `order_date` |
| "Find user by email" | GSI with PK: `email` |

**Index types — GSI vs LSI:**

| Property | **GSI** (Global) | **LSI** (Local) |
|---|---|---|
| PK | Different from base table | **Same** as base table |
| SK | Different from base table | Different |
| Created | Anytime | **Only at table creation** |
| Count | Up to 20 per table | Up to 5 per table |
| Consistency on reads | Eventual only | Eventual or strong |
| Throughput | Independent (own RCU/WCU) | Shares base table |
| Storage cost | Adds full or projected attributes | Same |
| Use when | Cross-partition alternative key | Multiple sort orders inside same partition |

**Capacity modes:**

| Mode | How you pay | Throttling | Best for |
|---|---|---|---|
| **On-Demand** | Per request (RCU/WCU) | Adapts; "warming" pattern for sudden 10×+ spikes | Unpredictable / spiky / new apps |
| **Provisioned** | Per-second RCU/WCU reservation + autoscaling | Throttles when over limit | Predictable, cost-optimized at scale |

**Capacity unit math:**

| Unit | Per second |
|---|---|
| 1 RCU | 1 strongly-consistent read of up to **4 KB**, OR 2 eventually-consistent reads |
| 1 WCU | 1 write of up to **1 KB** |
| Transactional read | 2× RCU |
| Transactional write | 2× WCU |

> Round up: a 4.5 KB read costs 2 RCU.

**Read consistency:**

| Read | Cost | Returns |
|---|---|---|
| Eventually consistent (default) | 0.5× RCU | May reflect a write up to a second old |
| Strongly consistent | 1× RCU | Guaranteed up-to-date — not allowed on GSIs |
| Transactional read (`TransactGetItems`) | 2× RCU | Cross-item consistent snapshot |

**Operations cheatsheet:**

| Op | Reaches | Use |
|---|---|---|
| `GetItem` | Single item by PK (and SK if present) | Lookups |
| `Query` | All items with a given PK; SK predicates allowed | Range scans within partition (the cheap pattern) |
| `Scan` | Whole table | **Avoid** — full table read; only OK for tiny tables / async batch |
| `PutItem` / `UpdateItem` / `DeleteItem` | Single item | Mutations |
| `BatchGetItem` / `BatchWriteItem` | Up to 25 items per call | Lower per-call overhead |
| `TransactWriteItems` / `TransactGetItems` | Up to 100 items, ACID | Multi-item consistency |
| `ConditionExpression` on writes | Optimistic concurrency | `attribute_not_exists`, version checks |

**DynamoDB Streams (CDC):**

| Property | Value |
|---|---|
| Granularity | Item-level change events, ordered per partition |
| Retention | 24 hours |
| `StreamViewType` | `KEYS_ONLY` / `NEW_IMAGE` / `OLD_IMAGE` / `NEW_AND_OLD_IMAGES` |
| Common consumer | Lambda (one shard per Lambda concurrency unit) |
| Use cases | Materialized views (sync to ES/Redshift), cross-region replication, audit log, event-driven workflows |

**TTL — free deletion:**

| Property | Value |
|---|---|
| Trigger | Per-item attribute set to a Unix timestamp |
| Behavior | Items deleted within ~48 h of expiry |
| Cost | **No WCU charged** for the delete |
| Visibility | Expired items appear in Streams as `DELETE` events |
| Use for | Session data, temp records, sliding-window caches |

**Global Tables (multi-region):**

| Property | Value |
|---|---|
| Mode | Active-active across 2+ regions |
| Replication | Async (sub-second typically) |
| Conflict resolution | **Last writer wins** based on timestamp |
| Use for | Global low-latency, regional disaster recovery |

**Single-table design (advanced):**

```
PK            SK             Data
USER#123      PROFILE        {name, email}
USER#123      ORDER#001      {total, status}
USER#123      ORDER#002      {total, status}
ORDER#001     ITEM#1         {product, qty}
ORDER#001     ITEM#2         {product, qty}
```

| Win | Cost |
|---|---|
| One table for all entities | Schema lives in app code, not DDL |
| Cross-entity transactions trivial | Steeper learning curve |
| Fewer table-level operational concerns | Strict access-pattern listing required up front |
| Read multiple entity types in one `Query` (overloaded SK prefixes) | Migrations and refactors are harder |

> Use single-table when you genuinely need cross-entity transactions and you've fully enumerated access patterns; otherwise multi-table is simpler.

**Hot-partition pitfalls and fixes:**

| Symptom | Cause | Fix |
|---|---|---|
| Throttled writes despite under-capacity overall | Skewed PK (one user / one tenant doing all writes) | Add a write-shard suffix: `user#123#shard-{0..9}` |
| Throttled reads on a popular key | One celebrity item | Cache (DAX or Redis) the hot keys; or read-shard with copies |
| Time-series writes hit one partition | All today's data has the same date prefix | Composite PK with random / hashed prefix |
| GSI throttling | GSI WCU < base table WCU | Provision GSI capacity ≥ what base table feeds it |

**Cost knobs:**

| Lever | Effect |
|---|---|
| Project only needed attributes into a GSI (`ProjectionType: KEYS_ONLY` / `INCLUDE`) | Smaller index, lower storage + WCU |
| Compress large blobs to S3, store key in DDB | Avoids 400 KB item limit + heavy WCU |
| Use TTL for ephemeral data | Free deletes |
| Provisioned + autoscaling for steady workloads | Up to ~5–7× cheaper than On-Demand |
| Reserved capacity (1y/3y) | Further provisioned discount |

**Pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Designing schema before listing access patterns | Forces costly migrations later |
| Using `Scan` in production hot paths | Reads the entire table — expensive + slow |
| Strong consistency on a GSI | Not supported — fall back to base table or eventual reads |
| Item > 400 KB | Hard limit — split or move blob to S3 |
| Storing huge attribute and indexing it | Index storage + write amplification |
| Treating DDB like SQL (joins, ad-hoc queries) | Wrong tool — use Athena/Redshift if you need that |

**Rule of thumb:** **list every access pattern, then design the keys.** PK = your most common filter; SK = the natural ordering you query in. **GSI for alternative access paths**, not for hindsight queries. **On-Demand for most apps** until predictable traffic justifies provisioned. **Streams + Lambda** is the standard event-driven outbound. **TTL for ephemeral data** — you stop paying. **Single-table design only when access patterns demand cross-entity transactions** — otherwise multi-table is simpler to evolve.
