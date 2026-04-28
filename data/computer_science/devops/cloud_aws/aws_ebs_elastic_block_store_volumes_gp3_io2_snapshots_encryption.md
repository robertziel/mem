### AWS EBS — Volumes, gp3/io2, Snapshots, Encryption

**Definition:** **Elastic Block Store** = persistent block storage attached to EC2 instances. Single-AZ, independent of instance lifecycle. Five volume types trade IOPS, throughput, and cost. **`gp3` is the default for almost everything**; reach for `io2` only when you need guaranteed IOPS.

**Five volume types:**

| Type | Class | Baseline IOPS | Max IOPS | Throughput | Use case |
|---|---|---|---|---|---|
| **`gp3`** (current GP) | General SSD | 3,000 | up to 16,000 | 125 MB/s (up to 1,000) | **Default for almost everything** |
| `gp2` (legacy) | General SSD | Burst, scales with size | Up to 16,000 | 250 MB/s | Use `gp3` instead |
| **`io2 Block Express`** | Provisioned SSD | Provisioned | Up to 256,000 | Up to 4,000 MB/s | Critical DBs needing guaranteed IOPS |
| `io1` (legacy) | Provisioned SSD | Provisioned | Up to 64,000 | 1,000 MB/s | Use `io2` instead |
| **`st1`** | Throughput HDD | 500 | 500 | 500 MB/s | Big data, log analytics |
| **`sc1`** | Cold HDD | 250 | 250 | 250 MB/s | Infrequent access, cheapest |
| `standard` (legacy magnetic) | — | — | — | Avoid |

**`gp3` vs `gp2` — always pick `gp3`:**

| Property | `gp2` | `gp3` |
|---|---|---|
| Baseline IOPS | Scales with size (3 IOPS / GB) | **3,000 baseline** (independent of size) |
| Throughput baseline | 250 MB/s | 125 MB/s (independent of size) |
| Burst | Yes (credits) | No (provisioned) |
| Cost | Higher | **~20% cheaper** |
| Provisioning IOPS extra | No | Yes (pay for what you need) |

> Always **migrate `gp2` → `gp3`** unless you specifically depend on `gp2` burst behavior.

**`io2 Block Express` — when to use:**

| Need | Detail |
|---|---|
| Latency-critical databases | Sub-ms latency |
| Sustained > 16,000 IOPS | Up to 256K |
| 99.999% durability | Higher than gp3 |
| Up to 64 TiB volumes | Bigger |
| Multi-attach (clustering) | Up to 16 instances |
| Use case | Oracle RAC, SAP HANA, large SQL Server |

**Volume sizing & limits:**

| Type | Min | Max |
|---|---|---|
| `gp3` | 1 GiB | 16 TiB |
| `io2 Block Express` | 4 GiB | 64 TiB |
| `st1` | 125 GiB | 16 TiB |
| `sc1` | 125 GiB | 16 TiB |

**Snapshots — incremental backups to S3:**

```bash
# Create snapshot
aws ec2 create-snapshot --volume-id vol-abc123 --description "Daily backup"

# Restore from snapshot (creates new volume, can be in any AZ in region)
aws ec2 create-volume --snapshot-id snap-xyz789 --availability-zone us-east-1a

# Cross-region copy for DR
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-xyz789 \
  --region eu-west-1
```

| Property | Detail |
|---|---|
| Stored in S3 | Managed by AWS |
| **Incremental** | Only changed blocks since last snapshot |
| First snapshot is full | Subsequent are diffs |
| Restore is full data | Even from incremental |
| Cross-AZ restore | Snapshot has region scope, can hydrate any AZ |
| Cross-region copy | Manual or automated (DLM / AWS Backup) |
| Concurrent restores | Lazy — initial reads slower |
| Fast Snapshot Restore (FSR) | Pre-warm a snapshot to skip initial slow reads |

**Snapshot automation:**

| Tool | Detail |
|---|---|
| **AWS Backup** | Cross-service unified backup, recommended |
| **Data Lifecycle Manager (DLM)** | EBS-specific, simpler |
| Manual cron + script | Avoid |
| **Recovery point** | Each snapshot is a point-in-time |
| **Retention rules** | Keep N daily, M weekly, etc. |

**Encryption — easy and free:**

| Property | Detail |
|---|---|
| Encryption at rest with KMS (AES-256) | Free |
| Enable account-wide default | `aws ec2 enable-ebs-encryption-by-default` |
| Per-volume override | Specify KMS key |
| Encrypted snapshots | Restore to encrypted volume |
| Plaintext → encrypted migration | Snapshot → copy with encryption → new volume |
| Cross-account encrypted copy | Re-encrypt with destination account's key |
| In-transit between EC2 and EBS | Always encrypted (since 2020+) |

**Multi-attach (`io2` only):**

| Property | Detail |
|---|---|
| Attach one volume to up to 16 instances | Same AZ |
| Use case | Clustered DBs (Oracle RAC, custom shared-disk apps) |
| Application-level coordination required | EBS doesn't manage write conflicts |
| Most users don't need this | Niche feature |

**Performance characteristics:**

| Property | Detail |
|---|---|
| EBS-optimized instance | Dedicated bandwidth to EBS (most modern instances are by default) |
| Volume queue depth | Higher = better IOPS utilization |
| `iostat -x` | Monitor IOPS, queue depth, latency |
| EBS limits per instance | Check instance type for max EBS bandwidth |
| `gp3` 16K IOPS only on EBS-optimized | Most modern types |

**Cost optimization:**

| Tip | Detail |
|---|---|
| Migrate `gp2` → `gp3` | ~20% savings, free migration |
| Right-size `gp3` IOPS / throughput | Default is enough for most |
| Snapshot lifecycle policies | Delete old, save money |
| Cold tier for snapshots | EBS Snapshots Archive (90% cheaper, 24h restore) |
| Detach + delete unattached volumes | Common waste |
| Use `sc1` for cold log storage | Cheapest |
| Avoid `io2` unless truly needed | Big premium |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Volume in wrong AZ | Can't attach to instance |
| Forgetting `gp3` migration | Paying `gp2` premium for nothing |
| `gp2` baseline IOPS too low for small volume | Tiny volumes throttle |
| `iops` provisioned but not paying attention | Bill creeps |
| Cross-region restore takes hours | Plan for FSR or Glacier |
| Encryption mismatch between source / target | Copy fails |
| Multi-attach without cluster software | Data corruption |
| Snapshots forever | Cost accumulates; set retention |
| `io2` on small DBs | Overkill, expensive |
| Detach + reattach to wrong instance | Data integrity confusion |

**Decision matrix:**

| Need | Pick |
|---|---|
| General workloads | **`gp3`** |
| Critical DB needing guaranteed IOPS | `io2 Block Express` |
| Big-data / log throughput | `st1` |
| Cold archival | `sc1` |
| Multi-instance clustered DB | `io2` with multi-attach |
| Need migration / large transfer | Snapshot + copy |
| Cross-AZ DR | Snapshot + restore in target AZ |
| Cross-region DR | Cross-region snapshot copy |

**Backup-ladder pattern:**

| Tier | Tool |
|---|---|
| Local snapshots (hourly, 24h retention) | DLM |
| Cross-AZ for app-level failure | Snapshot to other AZ |
| Cross-region for DR | Cross-region copy |
| Long-term archival | EBS Snapshots Archive |
| Off-AWS for ransomware | Vault / immutable copy |

**Cross-references:**

- VPC + subnets: [vpc_subnets_*.md](../networking/vpc_subnets_security_groups.md)
- RDS / Aurora HA: [rds_aurora_*.md](rds_aurora_high_availability_ha_replication.md)
- Disaster recovery: [disaster_recovery_*.md](../reliability_incident_management/disaster_recovery_dr.md)
- AWS Backup / DLM: [aws_backup_*.md](aws_backup_dlm_lifecycle_management.md)

**Rule of thumb:** **`gp3` for almost everything** (cheaper, faster baseline than `gp2`). Reach for **`io2 Block Express`** only when you need guaranteed IOPS or volumes > 16 TiB. **Encrypt by default** (it's free). **Automate snapshots** with **AWS Backup** or **DLM**, and copy critical ones cross-region. Snapshots are **incremental** — only changed blocks pay storage; full restores are still possible from any single snapshot.
