### AWS DynamoDB

**What DynamoDB is:**
- Fully managed NoSQL (key-value and document)
- Single-digit millisecond latency at any scale
- No servers, patching, or capacity planning (On-Demand mode)

**Key concepts:**
- **Table** - collection of items (like a SQL table)
- **Item** - a single record (like a row), max 400 KB
- **Partition key** - required, determines which partition stores the item
- **Sort key** - optional, enables range queries within a partition

**Key design:**
```
Table: Orders
  Partition key: user_id     (which partition)
  Sort key: order_date       (sorted within partition)

Enables:
  GET: user_id = "u_123" AND order_date = "2024-01-15"
  QUERY: user_id = "u_123" AND order_date BETWEEN "2024-01-01" AND "2024-12-31"
```

**Access patterns drive design (not normalization):**
```
Q: "Get all orders for a user" → PK: user_id, SK: order_date
Q: "Get order by ID"          → GSI with PK: order_id
Q: "Get recent orders"        → GSI with PK: status, SK: order_date
```

**GSI (Global Secondary Index):**
- Alternative partition + sort key for different query patterns
- Separate throughput from base table
- Eventually consistent (async projection)
- Up to 20 GSIs per table

**LSI (Local Secondary Index):**
- Same partition key, different sort key
- Must be created at table creation time
- Strongly consistent reads available
- Up to 5 LSIs per table

**Capacity modes:**
| Mode | How | Best for |
|------|-----|----------|
| On-Demand | Pay per request | Unpredictable traffic, new apps |
| Provisioned | Set RCU/WCU + auto-scaling | Predictable, cost optimization |

```
RCU (Read Capacity Unit): 1 strongly consistent read of 4 KB/sec
WCU (Write Capacity Unit): 1 write of 1 KB/sec
```

**DynamoDB Streams (CDC):**
- Ordered log of item-level changes (insert, update, delete)
- Trigger Lambda on every change
- Use for: materialized views, cross-region replication, audit log, event-driven

```
Table change → DynamoDB Stream → Lambda → Elasticsearch / S3 / notification
```

**TTL (auto-expiration):**
```
Set ttl attribute to Unix timestamp → DynamoDB auto-deletes after that time
Use for: sessions, temp data, cache entries (free deletion, no WCU)
```

**Global Tables (multi-region):**
- Active-active replication across 2+ regions
- Writes in any region, async replication to others
- Use for: global apps, disaster recovery
- Conflict resolution: last-writer-wins

**Single-table design (advanced):**
```
PK              SK              Data
USER#123        PROFILE         {name: "Alice", email: ...}
USER#123        ORDER#001       {total: 100, status: "shipped"}
USER#123        ORDER#002       {total: 50, status: "pending"}
ORDER#001       ITEM#1          {product: "Widget", qty: 2}
```
- Multiple entity types in one table
- Reduces number of tables, enables transactions across entities
- Complex but powerful for access-pattern-driven design

**Rule of thumb:** Design for access patterns first (not normalized schema). Partition key = your most common query filter. GSI for alternative query patterns. On-Demand for most apps (simple, no capacity planning). Use Streams + Lambda for event-driven reactions. TTL for auto-cleanup. Single-table design only when you truly need cross-entity transactions.
