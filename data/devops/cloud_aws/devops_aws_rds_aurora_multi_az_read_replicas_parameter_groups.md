### AWS RDS & Aurora

**RDS (Relational Database Service):**
- Managed: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server
- Handles patching, backups, replication, failover
- You choose: instance class, storage type, engine version

**Multi-AZ (high availability):**
```
Primary (us-east-1a) ←synchronous replication→ Standby (us-east-1b)
                         ↓ failover (~30 seconds)
            Standby promoted to primary automatically
```
- Synchronous replication (zero data loss)
- Automatic failover on: instance failure, AZ outage, storage failure
- Same endpoint (DNS flips to new primary)
- NOT for read scaling (standby doesn't serve reads)

**Read Replicas (read scaling):**
```
Writes → [Primary] →async replication→ [Replica 1] ← Reads
                   →async replication→ [Replica 2] ← Reads
```
- Up to 15 replicas (Aurora), 5 replicas (RDS)
- Async: replicas may lag seconds behind
- Can be cross-region (disaster recovery + low-latency global reads)
- Can be promoted to standalone DB (manual, for DR)

**Aurora specifics:**
- AWS-optimized MySQL/PostgreSQL compatible
- Up to 5x throughput of MySQL, 3x of PostgreSQL
- Storage auto-scales (10 GB to 128 TB)
- 6 copies of data across 3 AZs (built-in HA)
- Aurora Serverless v2: auto-scales compute (0.5 to 128 ACU)

**Aurora vs standard RDS:**
| Feature | RDS | Aurora |
|---------|-----|--------|
| Replication | Async to replicas | Shared storage (faster) |
| Failover | ~30 seconds | ~10 seconds |
| Max replicas | 5 | 15 |
| Storage | Manual provisioning | Auto-scaling |
| Cost | Lower | ~20% more |
| Best for | Small/medium workloads | High availability, scale |

**Parameter Groups (tuning):**
```bash
# Custom parameter group for PostgreSQL
aws rds create-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --db-parameter-group-family postgres16

# Tune parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --parameters "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory/4},ApplyMethod=pending-reboot" \
               "ParameterName=work_mem,ParameterValue=64MB,ApplyMethod=immediate"
```

Key PostgreSQL parameters to tune:
- `shared_buffers`: 25% of instance memory
- `work_mem`: 64-256 MB (depends on query complexity)
- `max_connections`: 100-500 (use PgBouncer for more)
- `effective_cache_size`: 75% of instance memory

**Automated backups:**
- Daily snapshots + transaction logs (point-in-time recovery)
- Retention: 1-35 days
- Backup window: choose low-traffic period
- Manual snapshots: persist until you delete them

**Performance Insights:**
- Visual tool to identify database bottlenecks
- Shows: top SQL queries, wait events, load by query
- Free tier: 7 days retention

**Rule of thumb:** Multi-AZ for production HA (automatic failover). Read replicas for read scaling (not HA). Aurora for high availability and scale (worth the ~20% cost premium). Always use Parameter Groups for tuning. Enable Performance Insights. Use PgBouncer for connection pooling above ~100 connections.
