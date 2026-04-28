### AWS RDS & Aurora — High Availability, Replication

**Definition:** **RDS** is AWS-managed relational DB (Postgres, MySQL, etc.); **Aurora** is AWS's cloud-native fork of MySQL/Postgres with **shared storage**, faster failover (~10s), more replicas (15), and better scale. **Multi-AZ** is HA (auto-failover); **Read replicas** scale reads (not HA by default).

**RDS basics:**

| Property | Detail |
|---|---|
| Managed engines | Postgres, MySQL, MariaDB, Oracle, SQL Server |
| AWS handles | Patching, automated backups, replication, failover |
| You choose | Instance class, storage, engine version, parameter group |
| You don't | Tune kernel, tweak FS, install custom extensions (some) |

**Multi-AZ — high availability:**

```
                  ┌──────────────┐
                  │  Primary     │  us-east-1a
                  │  (writes)    │
                  └──────┬───────┘
                         │ synchronous replication
                  ┌──────▼───────┐
                  │  Standby     │  us-east-1b
                  │  (no reads)  │
                  └──────────────┘

   On failure: standby promoted, DNS endpoint flips, ~30s
```

| Property | Detail |
|---|---|
| **Synchronous replication** | Zero data loss on primary failure |
| Failover triggers | Instance failure, AZ outage, storage failure, instance class change |
| Failover time | ~30–60 seconds (RDS); ~10–20 seconds (Aurora) |
| Same DNS endpoint | DNS automatically points to new primary |
| **Standby NOT for reads** | (Important — RDS Multi-AZ standby is invisible) |
| Aurora's "standby" | Reader replicas — they DO serve reads |

**Read Replicas — read scaling, NOT HA:**

```
   ┌──────────┐
   │ Primary  │ ──── async replication ────►  ┌──────────┐
   │ (writes) │                                │ Replica 1│ ◄── Reads
   └──────────┘ ──── async replication ────►  └──────────┘
                                               ┌──────────┐
                                               │ Replica 2│ ◄── Reads
                                               └──────────┘
```

| Property | Detail |
|---|---|
| **Async replication** | Replicas may lag seconds behind |
| Up to 5 replicas (RDS), 15 (Aurora) | |
| Cross-region replicas supported | Disaster recovery + global low-latency reads |
| Manual promotion | If primary dies, you promote a replica |
| Auto failover | Multi-AZ does this; replicas alone don't |
| Use cases | Read scaling, reporting, geo-distribution |
| **NOT for HA by themselves** | Async = data loss risk |

**Multi-AZ vs Read Replicas — different jobs:**

| Property | **Multi-AZ** | **Read Replicas** |
|---|---|---|
| Purpose | High availability (auto-failover) | Read scaling |
| Replication mode | Synchronous | Asynchronous |
| Data loss on failure | Zero | Possible (lag) |
| Reads on standby | No (RDS) | Yes |
| Failover time | ~30s automatic | Manual promotion |
| Cross-region | No (single region) | Yes |
| Number of secondaries | 1 standby (RDS) | Up to 5 / 15 |
| Cost | ~2× (running standby) | + per-replica cost |

**Aurora — AWS-optimized:**

| Property | Detail |
|---|---|
| MySQL / Postgres compatible | Drop-in for most apps |
| Up to **5×** MySQL throughput, **3×** Postgres | Storage architecture |
| **Storage auto-scales** | 10 GB to 128 TB |
| **6 copies of data across 3 AZs** | Built-in durability |
| Faster failover | ~10s typical |
| **Aurora Serverless v2** | Auto-scales compute (0.5 → 128 ACU) |
| Up to **15 replicas** | Same shared storage; replication is just metadata |
| Backtrack (MySQL) | Rewind to past point in time |

**Aurora architecture (key insight):**

```
                  ┌──────────────────────────────┐
                  │    Shared distributed storage   │
                  │    (6 copies, 3 AZs)             │
                  └────────────────────┬───────────┘
                                       │
       ┌─────────────────┬─────────────┼─────────────┬─────────────────┐
       ▼                 ▼             ▼             ▼                 ▼
   Writer            Reader 1      Reader 2      Reader N         Reader 15
                                  (read-only)  (read-only)
```

| Property | Detail |
|---|---|
| Compute decoupled from storage | Writers and readers share storage |
| Replicas don't replicate data | They read the same storage |
| Failover = promote a reader | Faster than RDS |
| Read replica lag | Minimal (~ms) — shared storage |

**Aurora vs standard RDS:**

| Feature | RDS | Aurora |
|---|---|---|
| Replication | Async to replicas | Shared storage (faster) |
| Failover | ~30s | ~10s |
| Max replicas | 5 | 15 |
| Storage | Manually provisioned | Auto-scaling (10GB–128TB) |
| Data durability | Multi-AZ snapshots | 6× replicated across 3 AZs |
| Cost | Lower | ~20% premium |
| Best for | Smaller workloads, broad engine support | HA + scale, high throughput |
| Engine support | All RDS engines | Only MySQL + Postgres |

**Aurora Serverless v2:**

| Property | Detail |
|---|---|
| Auto-scales compute (0.5 → 128 ACU) | Per-second granularity |
| Aurora Capacity Units (ACU) | ~2 GiB RAM each |
| Pay only for what's used | Cost-aware |
| Use case | Variable / unpredictable traffic |
| Caveat | Min ACU floor; not "scale to zero" by default |

**Aurora Global Database:**

| Property | Detail |
|---|---|
| Cross-region replication | Sub-second latency |
| Up to 5 secondary regions | |
| Read traffic in each | Low-latency global reads |
| Failover to secondary region | < 1 minute typical |
| Use case | Multi-region active-passive, DR |

**Backup & PITR (point-in-time recovery):**

| Feature | Detail |
|---|---|
| **Automated backups** | Daily snapshot + transaction logs |
| **Retention period** | 1–35 days |
| **PITR** | Restore to any second within retention |
| **Manual snapshots** | Indefinite retention |
| **Cross-region snapshot copy** | DR |
| Storage | S3 |

**Read-your-writes — replication lag mitigation:**

| Strategy | Detail |
|---|---|
| Route recent reads to primary | Pin user to primary for N seconds after write |
| Application-aware splitting | Track last-write timestamp, route accordingly |
| Sticky session | Same instance for write + immediate read |
| Use Aurora's near-zero lag | Mostly mitigates the problem |

**Performance & sizing:**

| Tip | Detail |
|---|---|
| Pick instance class with enough memory for working set | Hot data in cache |
| Use `r6g` / `r7g` (Graviton) for cost | ~20% cheaper |
| Provisioned IOPS for write-heavy DBs | Or `io2` storage |
| Connection pooling | RDS Proxy or PgBouncer |
| Enhanced monitoring | OS-level metrics |
| Performance Insights | Query-level perf |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using read replicas for HA | Data loss on failover (async lag) |
| Forgetting Multi-AZ for production | One AZ outage = downtime |
| Aurora at RDS prices in head | Aurora is ~20% more |
| Sync replication to read replicas | Aurora handles, RDS doesn't |
| No automatic backups configured | Restore-impossible scenario |
| `pg_basebackup` vs RDS snapshots confusion | RDS uses snapshots |
| Cross-region replica latency | Aurora Global is best for this |
| Forgetting `RDS Proxy` | Connection storms on Lambda integration |
| Same instance class for primary + replica | OK for HA, may be wasteful for read-only |
| Not testing failover | "Multi-AZ" un-tested = un-trusted |

**Decision matrix:**

| Need | Pick |
|---|---|
| Standard production HA | RDS Multi-AZ (any engine) |
| High throughput + many replicas | Aurora |
| Variable workload | Aurora Serverless v2 |
| Multi-region active-passive | Aurora Global Database |
| Cheap dev/staging | RDS single-AZ |
| Postgres extensions / control | RDS Postgres |
| Oracle / SQL Server | RDS (Aurora doesn't support) |

**Cross-references:**

- Disaster recovery: [disaster_recovery_*.md](../reliability_incident_management/disaster_recovery_dr.md)
- High availability patterns: [high_availability_*.md](../reliability_incident_management/high_availability_patterns.md)
- DB scaling (sharding, replicas): [database_scaling_*.md](../../system_design_hld_high_level_design/fundamentals/database_scaling_sharding_replication_read_replicas.md)
- PgBouncer / connection pooling: [pgbouncer_*.md](../../database_engineering/postgresql/pgbouncer_transaction_mode_vs_session_mode.md)

**Rule of thumb:** **Multi-AZ for production HA — automatic failover, zero data loss.** **Read replicas for read scaling**, not HA (async = data-loss risk). Reach for **Aurora** when you need **faster failover (~10s), more replicas (15), or auto-scaling storage** — it costs ~20% more but encodes a lot of reliability. Use **Aurora Global Database** for cross-region active-passive. Always **test failover** — un-tested HA isn't HA.
