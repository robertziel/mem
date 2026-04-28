### AWS Backup & Disaster Recovery — Cross-Region, RPO/RTO

**Definition:** **AWS Backup** is the centralized backup service spanning EBS, RDS, DynamoDB, EFS, S3, EC2 AMIs, Aurora, FSx. Combine with **per-service replication** (RDS Multi-AZ + replicas, S3 CRR, DynamoDB Global Tables) to achieve target **RPO** (data loss tolerance) and **RTO** (downtime tolerance).

**The two metrics that govern DR:**

| Metric | Question | Drives |
|---|---|---|
| **RPO** (Recovery Point Objective) | "How much data loss is OK?" | Backup / replication frequency |
| **RTO** (Recovery Time Objective) | "How long can we be down?" | Standby capacity + automation |

**AWS Backup — centralized service:**

| Property | Detail |
|---|---|
| Single service across many AWS resources | EBS, RDS, DynamoDB, EFS, S3, EC2, Aurora, FSx, Storage Gateway, VMware |
| **Backup plans** (schedule + retention + lifecycle) | Define once, applies via tags / resource selection |
| **Backup vaults** | Encrypted storage with access policies |
| **Cross-region copy** | Built-in for DR |
| **Cross-account copy** | Org-wide policies |
| **Compliance reports** | Audit-friendly |

**Backup plan example:**

```
Plan: production-daily
  Rule 1: Daily at 2 AM UTC
    Retention: 30 days
    Cold storage: after 7 days (cheaper)
    Cross-region copy: eu-west-1
  Rule 2: Monthly (1st of month)
    Retention: 1 year
  Resource selection: tag "Backup=true"
```

**Per-service backup methods:**

| Service | Backup method | Recovery |
|---|---|---|
| **EC2** | AMI snapshot | Launch from AMI |
| **EBS** | Volume snapshot (incremental, S3-backed) | Create new volume from snapshot |
| **RDS** | Automated backups + manual snapshots | Restore to point-in-time (PITR) |
| **Aurora** | Continuous backup (35 days) | Restore to any second |
| **DynamoDB** | On-demand snapshots + PITR (35 days) | Restore to any second |
| **EFS** | AWS Backup | Restore to new filesystem |
| **S3** | Versioning + cross-region replication | Restore previous version |
| **FSx** | Snapshots | Restore to new file system |
| **Lambda code** | Versions + aliases | Roll back via alias |

**Cross-region disaster recovery — service map:**

```
Primary (us-east-1)              DR (eu-west-1)
  ─────────────────────────────────────────────
  RDS Primary           ─async→  RDS Read Replica  (promote on failover)
  Aurora Cluster        ─Global→ Aurora Global DB  (1-min failover)
  S3 Bucket             ─CRR→    S3 Replica Bucket
  DynamoDB Table        ─Global→ DynamoDB Global Table (multi-master)
  EBS Snapshots         ─copy→   EBS Snapshots
  AMIs                  ─copy→   AMIs
  Secrets Manager       ─replicate→ Secrets Manager
  KMS keys              ─multi-region→ KMS keys

  Route 53: Failover routing → switch DNS to DR region
```

**RPO / RTO by strategy:**

| Strategy | RPO | RTO | Cost | Description |
|---|---|---|---|---|
| **Backup & Restore** | Hours | Hours | Lowest | Restore from backups in another region |
| **Pilot Light** | Minutes | 10–30 min | Low | Core (DB) running, scale up app on failover |
| **Warm Standby** | Seconds–Minutes | Minutes | Medium | Scaled-down copy running |
| **Active-Active** | Near zero | Near zero | Highest | Both regions serve traffic |

**Choosing a strategy — by data type:**

| Data | Strategy |
|---|---|
| Marketing site, no PII | Backup & Restore |
| Internal tool, hours of downtime tolerable | Pilot Light |
| B2B SaaS, customer-facing | Warm Standby |
| Banking, healthcare, regulated | Active-Active |

**3-2-1 backup rule:**

| Component | Detail |
|---|---|
| **3** copies of data | Original + 2 backups |
| **2** different media types | E.g., S3 + Glacier |
| **1** off-site copy | Different region / cloud / account |

**RDS / Aurora specifics:**

| Feature | Detail |
|---|---|
| **Automated backups** | Daily + transaction logs (1–35 day retention) |
| **PITR (Point-In-Time Recovery)** | Restore to any second within retention |
| **Manual snapshots** | Indefinite retention |
| **Cross-region snapshot copy** | DR |
| **Aurora Global** | Up to 5 secondary regions, < 1s lag, ~1-minute failover |
| **Read replicas** | Async, can be cross-region |
| **Multi-AZ standby** | Sync within region (automatic failover ~30s, no data loss) |

**DynamoDB specifics:**

| Feature | Detail |
|---|---|
| **PITR (Point-in-time recovery)** | Restore to any second in last 35 days |
| **On-demand backups** | Indefinite retention |
| **Global Tables** | Multi-region, multi-master, near-zero RPO |
| **Conflict resolution** | LWW by default; configurable |

**S3 backup options:**

| Mechanism | Detail |
|---|---|
| **Versioning** | All overwrites preserved |
| **Cross-Region Replication (CRR)** | Async, requires versioning |
| **Same-Region Replication (SRR)** | For compliance / log aggregation |
| **MFA delete** | Prevent accidental delete |
| **Object Lock** | WORM (write-once-read-many) for legal holds |
| **Glacier / Deep Archive** | Long-term cold |

**AWS Elastic Disaster Recovery (DRS):**

| Property | Detail |
|---|---|
| Continuous block-level replication to AWS | From on-prem or other cloud |
| **RPO seconds, RTO minutes** | Best for DR |
| Replicate servers without source-side overhead | Light footprint |
| Test DR without disrupting production | Frequent drills |
| Use case | Migrate to AWS or DR-only |

**KMS for backup encryption:**

| Practice | Detail |
|---|---|
| Use customer-managed KMS keys | Audit trail + rotation |
| Multi-region keys | Replicate encrypted backups |
| Cross-account access | Restore to another account |
| Vault access policies | Limit who can restore |

**Backup hygiene checklist:**

| Practice | Detail |
|---|---|
| **Automate** | No manual processes |
| **Test restores regularly** | Untested = unreliable |
| **Encrypt at rest** | KMS / customer-managed key |
| **Set retention policies** | Cost vs compliance |
| **Cross-region replicate** | Critical data |
| **Versioned object storage** | S3 versioning + CRR |
| **Air-gapped / immutable** | Ransomware defense |
| **Monitor for backup failures** | Alarm on missing backup |

**Recovery testing — the critical missing piece:**

| Practice | Detail |
|---|---|
| **DR drills** | Quarterly minimum |
| **Game days** | Inject regional failure, watch response |
| **Chaos engineering** | Validate self-healing |
| **Tabletop exercises** | Walk through scenarios |
| **Measure actual RTO/RPO** | Compare to objectives |
| **Document and update runbooks** | Per scenario |

> **An untested DR plan is not a plan.** Most companies discover this during the first real disaster.

**DR drill checklist:**

| Item | Detail |
|---|---|
| Restore from backup to test environment | Verify data integrity |
| RDS PITR test | Restore to past timestamp |
| Cross-region snapshot copy verified | Files actually arrive |
| Route 53 failover test | DNS flips correctly |
| App boots in DR region | Config + secrets accessible |
| Measure end-to-end RTO | Compare to objective |
| Document gaps | File action items |

**Ransomware-specific defenses:**

| Layer | Detail |
|---|---|
| **Immutable backups** (S3 Object Lock) | Can't be modified during retention |
| **Air-gapped offline copies** | Tape, separate network |
| **MFA delete on backups** | Stop attacker from deleting |
| **Cross-account / cross-cloud copies** | Beyond attacker reach |
| **Test restores with ransomware tabletop** | Practice |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Backups never tested | Discover broken on real disaster |
| Same KMS key region as primary | Lose key → lose backups |
| Same IAM keys for both regions | Compromise hits both |
| Async replication = data loss window | Be explicit about RPO |
| DR plan only in primary region | Can't access during outage |
| RTO/RPO mismatched to business needs | Either expensive overkill or insufficient |
| Skipping quarterly drill | Plan rots |
| Long-running cross-region snapshot copy | Plan for time |
| Forgetting Route 53 TTL | Slow DNS failover |
| No alerts on backup failures | Silent gaps |

**Cost considerations:**

| Item | Cost |
|---|---|
| Snapshots | Per-GB-month (incremental, cheap) |
| Cross-region copy | Data transfer + destination storage |
| Aurora Global | + cross-region replication fees |
| DynamoDB Global Tables | 2× write capacity (per region) |
| S3 CRR | Data transfer + destination storage |
| KMS | Per-request fee |

**Decision matrix:**

| Business profile | Strategy + tools |
|---|---|
| Marketing site, no PII | AWS Backup → S3, Backup & Restore |
| Internal SaaS | AWS Backup + RDS PITR + Pilot Light |
| Customer-facing 24/7 | Warm Standby + cross-region replicas |
| Regulated finance / health | Active-Active multi-region (Aurora Global / DynamoDB Global) |
| Strict RPO < 1 min | Active-Active + DRS for non-AWS workloads |

**Cross-references:**

- Disaster recovery (general): [disaster_recovery_*.md](../reliability_incident_management/disaster_recovery_dr.md)
- High availability patterns: [high_availability_*.md](../reliability_incident_management/high_availability_patterns.md)
- AWS RDS / Aurora HA: [rds_aurora_*.md](rds_aurora_high_availability_ha_replication.md)
- Multi-region scaling: [scaling_high_traffic_*.md](../../system_design_hld_high_level_design/fundamentals/scaling_high_traffic_horizontal_caching_redis_cdn.md)
- Incident response: [incident_response_*.md](../reliability_incident_management/incident_response.md)

**Rule of thumb:** **Pick DR strategy from RPO + RTO + budget.** Most companies need **Pilot Light** or **Warm Standby**. Use **AWS Backup** for centralized policy, enable **cross-region copy** for critical data, and **test quarterly** — untested backups aren't backups. Apply the **3-2-1 rule** + **immutable backups** for ransomware defense. **DynamoDB Global Tables** + **Aurora Global** are the easiest paths to near-zero RPO/RTO.
