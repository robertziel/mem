### AWS RDS — Parameter Groups, Backups, Monitoring

**Three configuration objects to know:**

| Object | What it controls |
|---|---|
| **DB Parameter Group** | Per-instance engine settings (`shared_buffers`, `work_mem`, …) |
| **DB Cluster Parameter Group** (Aurora) | Cluster-wide engine settings shared by all writer + readers |
| **Option Group** (RDS legacy) | Engine-specific add-ons (Oracle TDE, SQL Server Audit, MariaDB plugins) |
| **Subnet Group** | Which subnets RDS can place instances in |
| **Security Group** | Network ingress |

> **Never modify the default parameter group.** Always create a custom one.

**Parameter group basics:**

| Operation | Command / detail |
|---|---|
| Create | `aws rds create-db-parameter-group --db-parameter-group-name X --db-parameter-group-family postgres16` |
| Modify | `aws rds modify-db-parameter-group --db-parameter-group-name X --parameters ...` |
| Apply method | `immediate` (dynamic param) or `pending-reboot` (static — needs restart) |
| Attach to instance | `aws rds modify-db-instance --db-instance-identifier my-db --db-parameter-group-name X --apply-immediately` |
| Reboot for static params | `aws rds reboot-db-instance --db-instance-identifier my-db` |

**Common PostgreSQL params worth tuning:**

| Param | Recommended | Notes |
|---|---|---|
| `shared_buffers` | `{DBInstanceClassMemory/4}` (≈ 25%) | Static; reboot needed |
| `effective_cache_size` | 70–75% of memory | Hint to planner; dynamic |
| `work_mem` | 16–256 MB | Per-sort/hash; multiplies by concurrent queries |
| `maintenance_work_mem` | 1–2 GB | For VACUUM / index builds |
| `max_connections` | 100–500 (use PgBouncer beyond) | Each conn ~10 MB |
| `wal_compression` | `on` | Smaller WAL, less I/O |
| `log_min_duration_statement` | 200 ms or 1000 ms | Slow query log |
| `random_page_cost` | 1.1 (SSD) | Default 4.0 was for spinning disks |
| `effective_io_concurrency` | 200 (SSD) | Concurrent index lookups |
| `autovacuum_max_workers` | 3–6 | Higher for write-heavy |

**Common MySQL params worth tuning:**

| Param | Recommended | Notes |
|---|---|---|
| `innodb_buffer_pool_size` | 75% of memory | Equivalent to PG `shared_buffers` |
| `innodb_log_file_size` | 1–4 GB | Larger = better write throughput |
| `innodb_flush_log_at_trx_commit` | 1 (durable) / 2 (faster) | Trade durability for perf |
| `innodb_flush_method` | `O_DIRECT` | Avoid double caching |
| `max_connections` | 200–1000 | + ProxySQL/HAProxy for more |
| `query_cache_type` | `0` (off) | Removed in 8.0 |
| `slow_query_log` + `long_query_time` | `1` + `1` | Slow query log |

**Backup options:**

| Type | Detail |
|---|---|
| **Automated backups** | Daily snapshot + 5-min transaction log shipping → PITR |
| **Manual snapshots** | On-demand; survive even if you delete the instance |
| **Snapshot copy across regions** | DR pattern |
| **Snapshot copy across accounts** | Compliance / partner workflows |
| **AWS Backup** | Centralized backup policy across services |

**Backup retention windows:**

| Setting | Range |
|---|---|
| Automated backups | 0–35 days (set to **at least 7**) |
| `0` disables automated backups | **Disables PITR + free read replicas** — don't use 0 in prod |
| Manual snapshots | Forever until deleted |
| Backup window | Pick a low-traffic time |
| Final snapshot on deletion | Keep enabled in prod |
| Deletion protection | Enable for production |

**Point-in-time recovery (PITR):**

| Property | Detail |
|---|---|
| Granularity | Any second within the retention window |
| RPO | ~5 minutes (transaction log shipping interval) |
| RTO | Variable — full restore creates a **new instance** |
| Cost | Per-GB-month × retention days |
| Restore | `aws rds restore-db-instance-to-point-in-time --target-db-instance-identifier my-db-restored --source-db-instance-identifier my-db --restore-time 2024-04-15T10:00:00Z` |

**Monitoring layers:**

| Layer | What it gives you |
|---|---|
| **CloudWatch Metrics** (basic, free) | CPU, memory, connections, IOPS, latency |
| **Enhanced Monitoring** (paid, OS-level) | Per-second OS metrics: CPU breakdown, processes, swap |
| **Performance Insights** (visual SQL profiler) | Top SQL, wait events, load by query |
| **DB engine slow query log** | Per-query analysis |
| **CloudWatch Logs** for engine logs | Auditing + alerting |

**Performance Insights — what to look at:**

| Tab | Use |
|---|---|
| Database load (DB load by wait event) | Is it CPU? IO? lock? |
| Top SQL by load | Worst-offender queries |
| Top wait events | `LWLock`, `IO:DataFileRead`, `Lock:Tuple` |
| Top hosts / users | Multi-tenant attribution |
| Counter metrics | Buffer hit rate, deadlocks, etc. |

**Standard alerts every prod RDS needs:**

| Alert | Threshold |
|---|---|
| CPU sustained > 80% | 5 min |
| FreeableMemory < 10% of instance memory | 5 min |
| FreeStorageSpace < 20% | 30 min |
| ReadLatency / WriteLatency p95 high | Service-dependent |
| ReplicaLag > 30 s | Tight on critical replicas |
| DatabaseConnections approaching `max_connections` | 80% threshold |
| BurstBalance (gp2) low | gp2 only |
| BackupStorageBilledTotalBytes growing fast | Cost signal |
| Failed backup | Any |

**Replicas — read scaling + DR:**

| Type | Detail |
|---|---|
| **Read replica** | Async; for read scaling + cross-region DR |
| Cross-region replica | Async; cross-region DR |
| Aurora reader | Sub-second lag; up to 15 readers per cluster |
| **Multi-AZ standby** | Sync; failover target; **NOT a read endpoint** (except Aurora) |

> **Multi-AZ is not a replica** — it's a standby for failover. Need read scaling? Add read replicas.

**Multi-AZ failover behavior:**

| Phase | Detail |
|---|---|
| Detect failure | Health check |
| Promote standby | DNS endpoint flips to standby |
| Total time | 60–120 s typical |
| Aurora | Faster — 30 s typical (storage shared, just promote a reader) |
| App must reconnect | Connection pool needs to retry on connection failure |

**Connection pooling:**

| Approach | Detail |
|---|---|
| **RDS Proxy** | AWS-managed PG/MySQL proxy; supports IAM auth, fail-over awareness |
| **PgBouncer** | Most popular self-hosted PG pooler |
| **ProxySQL** | MySQL-equivalent self-hosted |
| App-level pool | Built into ORMs (ActiveRecord, SQLAlchemy) |
| **Why pool**: each Postgres conn ≈ 10 MB; > 100 idle = waste | Critical for serverless / Lambda |

**Storage choices:**

| Type | Use |
|---|---|
| **gp3** | Default; cheaper than gp2; tunable IOPS/throughput |
| gp2 | Legacy; migrate to gp3 |
| io1 / io2 | High IOPS DBs |
| io2 Block Express | Highest IOPS + throughput |
| Aurora | Auto-scaling shared storage |

**Aurora-specific notes:**

| Concept | Detail |
|---|---|
| Storage | Distributed, auto-scaling, replicated 6× across 3 AZs |
| Failover | < 30 s typical |
| Read replicas | Sub-second lag; up to 15 |
| **Aurora Serverless v2** | Auto-scales ACUs; great for variable load |
| **Global Database** | Cross-region with < 1 s replication lag |
| **I/O-Optimized** | Pricing model better for write-heavy |
| **Backtrack** (Aurora MySQL) | Rewind in time without restore |

**Maintenance windows:**

| Concern | Detail |
|---|---|
| Maintenance window | Weekly hour for AWS-applied minor patches |
| Pending modifications | View with `aws rds describe-pending-maintenance-actions` |
| Blue/green deployment (RDS) | Promote a parallel updated instance with low downtime |
| Major version upgrades | Schedule explicitly; test in staging |

**Cost levers:**

| Lever | Effect |
|---|---|
| Reserved Instance (1y / 3y) | 40–60% savings |
| Aurora Serverless v2 | Pay per ACU; great for variable load |
| Right-size primary | Use Compute Optimizer / Performance Insights |
| Stop dev DBs at night | Manual or scheduler Lambda |
| Multi-AZ only for prod / pre-prod | Not for dev |
| Aurora I/O-Optimized | If write-heavy and I/O cost dominates |
| gp3 over gp2 | ~20% cheaper at same IOPS |

**IAM database authentication:**

| Concept | Detail |
|---|---|
| Sign in with IAM token instead of password | Token valid 15 minutes |
| Per-user / per-role mapping | Audit trail via IAM |
| Compatible with PG + MySQL | Setup with `rds_iam` role |
| Pair with RDS Proxy for connection sharing | Better at scale |

**Encryption:**

| Layer | Detail |
|---|---|
| At rest (storage) | KMS-managed; can't enable after creation |
| In transit | TLS — enforce with `rds.force_ssl = 1` (PG) / require_secure_transport (MySQL) |
| Backups | Encrypted (inherits from instance) |
| Snapshots cross-region | Re-encrypt with destination region key |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Modifying default parameter group | AWS resets it; use custom |
| `max_connections` too high | Each conn = ~10 MB; OOM risk |
| `work_mem` too high × many queries | Sum > free memory → OOM |
| Backup retention = 0 | Disables PITR + free replicas |
| Multi-AZ assumed to be a replica | It's a standby — not readable (except Aurora) |
| Snapshot copy across regions costs ignored | Compounds storage bill |
| Performance Insights off | Missing the best diagnostic tool |
| Application doesn't handle failover reconnect | App outage during 60-s flip |
| Not using RDS Proxy from Lambda | Connection storm on cold start |
| Major version upgrades without staging test | Surprise breakages |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Default OLTP | RDS PostgreSQL with Multi-AZ + 7-day backups + Performance Insights |
| Variable load | Aurora Serverless v2 |
| Multi-region active-active | Aurora Global Database |
| Strict cost | Reserved Instance + gp3 |
| High write throughput | Aurora I/O-Optimized |
| Lambda / many connections | RDS Proxy |
| Migrating from on-prem | DMS + Aurora target |

**Cross-references:**

- DB replication topologies: [replication_topologies_*.md](../../database_engineering/replication_topologies_primary_replica_failover_sync.md)
- PG query optimization: [query_optimization_explain_analyze_*.md](../../database_engineering/query_optimization_explain_analyze_indexes.md)
- AWS cost optimization: [aws_cost_optimization_*.md](aws_cost_optimization_savings_plans_spot_reserved.md)

**Rule of thumb:** **always custom parameter groups** (never default), **`shared_buffers` / `innodb_buffer_pool_size` ≈ 25% (PG) / 75% (MySQL) of memory** as a starting point. **Backup retention ≥ 7 days; Multi-AZ + Performance Insights for every production instance.** **RDS Proxy or PgBouncer** when you have > 100 connections or any Lambda traffic. **Reserved Instances** for steady prod, **Aurora Serverless v2** for variable load.
