### RDS & Aurora: High Availability & Replication

**RDS basics:**
- Managed: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server
- Handles patching, backups, replication, failover
- You choose: instance class, storage type, engine version

**Multi-AZ (high availability):**
```
Primary (us-east-1a) <-synchronous replication-> Standby (us-east-1b)
                         | failover (~30 seconds)
            Standby promoted to primary automatically
```
- Synchronous replication (zero data loss)
- Automatic failover on: instance failure, AZ outage, storage failure
- Same endpoint (DNS flips to new primary)
- NOT for read scaling (standby doesn't serve reads)

**Read Replicas (read scaling):**
```
Writes -> [Primary] ->async replication-> [Replica 1] <- Reads
                    ->async replication-> [Replica 2] <- Reads
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

**Rule of thumb:** Multi-AZ for production HA -- it gives automatic failover with zero data loss. Read replicas for read scaling, not HA. Aurora for high availability and scale where the ~20% cost premium is worth faster failover, more replicas, and auto-scaling storage. Use cross-region replicas for disaster recovery and global read latency.
