### AWS ElastiCache (Managed Redis / Memcached)

**What ElastiCache is:**
- Fully managed in-memory caching service
- Two engines: Redis and Memcached

**Redis vs Memcached on ElastiCache:**
| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data structures | Strings, lists, sets, sorted sets, hashes, streams | Strings only |
| Persistence | Yes (RDB + AOF) | No |
| Replication | Yes (primary + up to 5 replicas) | No |
| Multi-AZ failover | Yes (automatic) | No |
| Pub/Sub | Yes | No |
| Lua scripting | Yes | No |
| Threading | Mostly single-threaded | Multi-threaded |
| Max node memory | 635 GB (r7g.16xlarge) | Same |
| Use case | Versatile (cache, sessions, queues, leaderboards) | Simple caching, large pool |

**Choose Redis** for almost everything. Choose Memcached only for simple string caching where you need multi-threaded performance and don't need persistence.

**Cluster mode:**
```
Cluster Mode Disabled (simpler):
  Primary → Replica 1 → Replica 2
  All data on every node, max = one node's memory

Cluster Mode Enabled (horizontal scaling):
  Shard 1: Primary + Replicas (hash slots 0-5460)
  Shard 2: Primary + Replicas (hash slots 5461-10922)
  Shard 3: Primary + Replicas (hash slots 10923-16383)
  Data partitioned across shards, scales beyond one node
```

**Common use cases in Rails/web apps:**
```ruby
# Session store
config.session_store :redis_store, servers: [ENV["REDIS_URL"]], expire_after: 30.minutes

# Cache store
config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"], expires_in: 1.hour }

# Sidekiq backend
Sidekiq.configure_server { |config| config.redis = { url: ENV["REDIS_URL"] } }

# Rate limiting (sorted sets)
# Leaderboards (sorted sets)
# Real-time features (pub/sub)
```

**Connection management:**
- ElastiCache endpoint: `my-cluster.abc123.0001.use1.cache.amazonaws.com:6379`
- Cluster mode: use the Configuration Endpoint (auto-discovers shards)
- In Rails: use connection pooling (`connection_pool` gem or `redis-rb` pool)

**Security:**
- **VPC only** (no public access, must be in same VPC as app)
- **Auth token** (Redis AUTH): password protection
- **Encryption in-transit** (TLS): encrypt connections
- **Encryption at-rest**: encrypt data on disk
- **Security Groups**: restrict to app server SGs only

**Sizing:**
```
Memory needed = data size × 2 (Redis overhead) + 25% buffer
Example: 10 GB of cached data → 25 GB ElastiCache node

Factor in:
  - Replication: each replica stores full copy
  - Eviction: allkeys-lru when memory full
  - Connections: each connection uses ~10 KB
```

**Monitoring:**
| Metric | Alert when |
|--------|-----------|
| CPUUtilization | > 90% sustained |
| EngineCPUUtilization | > 90% (Redis-specific) |
| DatabaseMemoryUsagePercentage | > 80% |
| CurrConnections | Approaching maxclients |
| Evictions | > 0 (losing cached data) |
| ReplicationLag | > 1 second |
| CacheHitRate | < 80% (cache not effective) |

**Rule of thumb:** Use Redis (not Memcached) for almost everything. Cluster Mode Enabled for data > single node memory. Enable encryption in-transit and at-rest. Monitor evictions (means cache is too small). Cache hit rate should be > 90%. Keep ElastiCache in the same AZ as your app servers for lowest latency.
