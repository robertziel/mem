### AWS Database Services

**RDS (Relational Database Service):**
- Managed PostgreSQL, MySQL, MariaDB, Oracle, SQL Server
- Handles: patching, backups, replication, failover
- **Multi-AZ** - synchronous standby for HA (automatic failover)
- **Read Replicas** - async replicas for read scaling (cross-region possible)
- **Aurora** - AWS-optimized MySQL/PostgreSQL, 5x throughput, auto-scaling storage

**RDS best practices:**
- Enable Multi-AZ for production
- Use read replicas for read-heavy workloads
- Enable automated backups (up to 35 days retention)
- Use Parameter Groups for tuning (shared_buffers, work_mem)
- Use Security Groups to restrict access to app servers only
- Enable encryption at rest and in transit
- Monitor with Enhanced Monitoring and Performance Insights

**DynamoDB:**
- Fully managed NoSQL (key-value and document)
- Single-digit millisecond latency at any scale
- Capacity modes: On-Demand (pay per request) or Provisioned (with auto-scaling)
- Use for: session store, user profiles, IoT data, gaming leaderboards

**DynamoDB key concepts:**
- **Partition key** - determines which partition stores the item
- **Sort key** - optional, enables range queries within a partition
- **GSI (Global Secondary Index)** - alternative query patterns
- **LSI (Local Secondary Index)** - alternate sort key, same partition key
- **DynamoDB Streams** - change data capture (trigger Lambda on writes)
- **TTL** - auto-delete expired items

**ElastiCache:**
- Managed Redis or Memcached
- Use for: session store, caching, rate limiting, pub/sub, leaderboards
- Redis: persistence, replication, Lua scripting, data structures
- Memcached: simpler, multi-threaded, no persistence

**When to use what:**

| Service | Use case |
|---------|----------|
| RDS/Aurora | Relational data, complex queries, transactions |
| DynamoDB | Key-value lookups, high throughput, simple queries |
| ElastiCache | Caching, sessions, real-time data |
| Redshift | Data warehouse, analytics |
| DocumentDB | MongoDB-compatible |

**Rule of thumb:** Start with RDS PostgreSQL for most workloads. DynamoDB when you need extreme scale with simple access patterns. ElastiCache Redis for caching and sessions. Always enable Multi-AZ for production databases.
