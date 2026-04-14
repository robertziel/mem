### Database Sharding Strategies

**When to shard:**
- Single database can't handle write volume
- Dataset too large for one machine
- After exhausting: query optimization, read replicas, caching, vertical scaling

**Sharding key (partition key):**
- The column used to determine which shard holds the data
- Choosing the right key is the most critical decision
- Bad key -> hot shards, uneven distribution, impossible queries

**Good sharding key properties:**
- High cardinality (many distinct values)
- Even distribution (no hot spots)
- Frequently used in queries (avoid cross-shard queries)
- Stable (doesn't change often)

**Sharding strategies:**

**Hash-based:**
```
shard = hash(user_id) % num_shards
```
- Even distribution
- No range queries across shards
- Adding shards requires rehashing (use consistent hashing)

**Range-based:**
```
Shard 1: user_id 1-1,000,000
Shard 2: user_id 1,000,001-2,000,000
```
- Range queries within a shard are efficient
- Risk of hot spots (newest data = most active)
- Easy to add shards (split a range)

**Geographic:**
```
Shard EU: users in Europe
Shard US: users in Americas
Shard APAC: users in Asia-Pacific
```
- Data locality (low latency)
- Uneven distribution if regions differ in size
- Cross-region queries are expensive

**Directory-based:**
```
Lookup table: user_id -> shard_id
Shard 1: [user_123, user_456, ...]
Shard 2: [user_789, user_012, ...]
```
- Maximum flexibility (can move individual users)
- Lookup table is a bottleneck and SPOF
- Extra hop for every query

**Common sharding challenges:**

**Cross-shard joins:**
- Can't JOIN data across shards efficiently
- Solutions: denormalize, application-level joins, co-locate related data on same shard

**Cross-shard transactions:**
- No native ACID across shards
- Solutions: saga pattern, eventual consistency, two-phase commit (slow)

**Rebalancing:**
- When shard gets too large or hot
- Consistent hashing: only ~1/N keys move
- Range-based: split the range, move half to new shard
- Requires careful data migration with minimal downtime

**Auto-increment IDs:**
- Can't use standard auto-increment (conflicts across shards)
- Solutions: UUID, Snowflake ID, sequence service, range-based allocation

**Snowflake ID structure:**
```
| timestamp (41 bits) | datacenter (5 bits) | worker (5 bits) | sequence (12 bits) |
```
- Globally unique, roughly time-ordered, no coordination needed
- 64-bit integer, fits in BIGINT

**Sharding vs partitioning:**
- **Sharding** - data split across multiple database servers
- **Partitioning** - data split within a single database (PostgreSQL table partitioning)
- Partition first (simpler), shard when single server is insufficient

**Rule of thumb:** Shard by user_id or tenant_id for most SaaS applications. Use consistent hashing to minimize reshuffling. Co-locate related data on the same shard. Use Snowflake IDs for globally unique primary keys. Partition before you shard.
