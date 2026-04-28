### Disaster Recovery (DR) — RPO, RTO, Strategies

**Definition:** **DR** is the plan for recovering operations after a major event (region outage, data corruption, ransomware). Two metrics frame every conversation: **RPO** (how much data loss is OK) and **RTO** (how much downtime is OK). The DR strategy is a tradeoff between these and cost.

**The two governing metrics:**

| Metric | Question | Implication |
|---|---|---|
| **RPO** (Recovery Point Objective) | "How much data can we lose?" | Drives backup / replication frequency |
| **RTO** (Recovery Time Objective) | "How long can we be down?" | Drives standby capacity + automation |

**Examples:**

| Business need | RPO | RTO |
|---|---|---|
| Critical financial trades | 0 (sync replication) | < 1 minute |
| E-commerce | < 5 min | < 30 min |
| SaaS B2B | < 1 hour | < 4 hours |
| Internal tools | 24 hours | 24 hours |
| Marketing site | 24 hours | Days |

**Four DR strategies (cost / speed spectrum):**

| Strategy | RTO | RPO | Cost | Description |
|---|---|---|---|---|
| **Backup & Restore** | Hours–days | Hours | Lowest | Restore from backups in another region |
| **Pilot Light** | 10–30 min | Minutes | Low | Core infra running (DB replica), scale up on failover |
| **Warm Standby** | Minutes | Seconds–minutes | Medium | Scaled-down copy running, scale up on failover |
| **Active-Active (multi-region)** | Near zero | Near zero | Highest | Both regions serve traffic |

**Visualizing the spectrum:**

```
   ▲ Cost
   │                                          [Active-Active]
   │
   │                                  [Warm Standby]
   │
   │                       [Pilot Light]
   │
   │     [Backup & Restore]
   └────────────────────────────────────────────────► Speed (lower RTO/RPO)
```

**1. Backup & Restore (cheapest):**

| Component | Detail |
|---|---|
| Database backups | RDS automated + manual snapshots; pg_dump |
| File backups | S3 cross-region replication |
| Infrastructure | Terraform code (re-deployable) |
| Recovery process | Restore DB → deploy infra → switch DNS |
| Pros | Cheapest |
| Cons | Hours of RTO; some data loss |

**2. Pilot Light:**

```
   ┌─────────────┐         ┌──────────────────┐
   │ Primary     │  data   │ DR (pilot light) │
   │  region     │ ──────► │                  │
   │  - DB        │         │  - DB replica    │
   │  - App       │         │  - infra ready   │
   │  - LB        │         │  - app NOT       │
   │              │         │     running      │
   └─────────────┘         └──────────────────┘
                                  │
                              On failover:
                              - promote DB replica
                              - apply Terraform (start app)
                              - switch DNS
```

| Component | Detail |
|---|---|
| Database | Cross-region read replica (constantly replicating) |
| App servers | Not running (Terraform ready to apply) |
| Load balancer | Pre-configured |
| DNS | Route53 health check + failover record |
| Pros | Faster than backup-restore |
| Cons | Still ~10–30 min RTO; recovery requires action |

**3. Warm Standby:**

```
   ┌─────────────┐         ┌──────────────────┐
   │ Primary     │  data   │ DR (warm)        │
   │  - DB         │ ──────► │  - DB replica    │
   │  - 10 servers │         │  - 2 servers     │
   │              │         │     (scaled down)│
   └─────────────┘         └──────────────────┘
                                  │
                              On failover:
                              - promote DB replica
                              - scale up servers (2 → 10)
                              - switch DNS
```

| Component | Detail |
|---|---|
| Database | Replica live |
| App servers | Running but scaled down |
| Routing | Ready, just needs DNS flip |
| Pros | Few minutes RTO; less to do during failover |
| Cons | Pays for idle infra |

**4. Active-Active (multi-region):**

```
   ┌─────────────┐         ┌─────────────┐
   │ us-east-1   │ ◄─────► │ us-west-2   │
   │  - DB         │  sync   │  - DB         │
   │  - 10 servers │         │  - 10 servers │
   └─────┬───────┘         └─────┬───────┘
         │                       │
         └───── Route53 ────────┘
              (latency-routed)
```

| Component | Detail |
|---|---|
| Both regions live | Serve traffic continuously |
| DB | Multi-region (DynamoDB Global Tables, Aurora Global, Spanner) |
| Routing | Latency-based or weighted |
| Pros | Near-zero RTO + RPO; no failover needed |
| Cons | Most complex; consistency challenges |

**Backup strategy (3-2-1 rule):**

| Component | Detail |
|---|---|
| **3** copies of data | Original + 2 backups |
| **2** different media types | E.g. S3 + glacier-class |
| **1** copy offsite | Different region / cloud |

**Backup hygiene:**

| Practice | Detail |
|---|---|
| **Automate backups** | No manual processes |
| **Test restores regularly** | Untested backups are not backups |
| **Encrypt at rest** | KMS / customer-managed keys |
| **Retention policies** | Hot (recent), cold (compliance) |
| **Cross-region replication** | Critical data |
| **Versioned object storage** | S3 versioning + replication |
| **Air-gapped / immutable** | Ransomware defense |
| **Database point-in-time recovery (PITR)** | RDS / Aurora / Postgres |

**Specific data types:**

| Data | Backup strategy |
|---|---|
| Relational DB | RDS automated backups + snapshots, PITR enabled |
| Object storage (S3) | Cross-region replication + versioning |
| Block storage (EBS) | Snapshots, multi-region copy |
| Containers / images | ECR / ACR cross-region replication |
| Secrets | Cross-region replicated KMS / Secrets Manager |
| DNS / config | Stored in IaC (git) |
| Customer files | Replicated S3 + lifecycle to Glacier |

**Recovery testing — the critical missing piece:**

| Practice | Detail |
|---|---|
| **DR drills** | Quarterly minimum |
| **Game days** | Inject regional failure, watch response |
| **Chaos engineering** | Validate self-healing |
| **Runbook exercises** | Tabletop walkthroughs |
| **Measure actual RTO/RPO** | Compare to objective |
| **Track action items** | Drills always reveal gaps |

> **An untested DR plan is not a plan.** Most companies discover this during their first real disaster.

**DNS failover (Route53 / similar):**

| Pattern | Detail |
|---|---|
| **Failover routing** | Active record + standby; health-check primary |
| **Latency routing** | Send users to closest healthy region |
| **Weighted routing** | 80% / 20% split for canary |
| **Geolocation routing** | Per-country region |
| **TTL trade-off** | Low TTL = faster failover, more queries |

**Database failover specifics:**

| DB | Failover mechanism |
|---|---|
| **RDS Multi-AZ** | Automatic, < 60s typically (same region) |
| **RDS read replica** | Promote replica → write target |
| **Aurora Global** | Promote secondary; ~minute |
| **DynamoDB Global Tables** | Multi-master; near-zero |
| **Spanner** | Global by design |
| **Postgres self-managed** | Patroni / Stolon / pglogical |

**Ransomware-specific defenses:**

| Layer | Detail |
|---|---|
| **Immutable backups** (S3 Object Lock) | Can't be modified during retention |
| **Air-gapped offline copies** | Tape, separate network |
| **Backup MFA delete** | S3 versioning + MFA-delete |
| **Cross-account / cross-cloud copies** | Beyond attacker reach |
| **Test restores with real ransomware tabletop** | Practice |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Backups never tested | Discover broken backups during real disaster |
| Only one region | Region outage = total outage |
| Manual recovery process | Slow + error-prone |
| Cross-region data + same IAM keys | Compromised keys = both regions gone |
| Sync replication to DR | Adds latency to writes (sometimes desirable) |
| Async replication = data loss window | Be explicit about RPO |
| DR plan not in source control | Lost when needed |
| RTO/RPO mismatched to business needs | Either expensive overkill or insufficient |
| DR drill skipped this year | Plan rots |
| Old runbooks in DR-region S3 | Can't access during outage |
| Single point of failure: DNS | Multi-DNS provider; cached records help |

**Decision matrix:**

| Business profile | Strategy |
|---|---|
| Marketing site, no PII | Backup & Restore |
| Internal tooling | Pilot Light |
| B2B SaaS, hours of downtime tolerable | Pilot Light or Warm Standby |
| Customer-facing 24/7 | Warm Standby or Active-Active |
| Regulated finance / health | Active-Active multi-region |
| Compliance with strict RPO/RTO | Active-Active + immutable backups |

**Cross-references:**

- Incident response (during the disaster): [incident_response_*.md](incident_response.md)
- Multi-region architecture: [multi_region_*.md](../../system_design_hld_high_level_design/fundamentals/multi_region_active_active_replication.md)
- AWS IAM + cross-account: [aws_organizations_*.md](../../cloud_aws/aws_organizations_accounts_scp.md)
- Chaos engineering: [chaos_*.md](../../distributed_systems/chaos_engineering_failure_injection.md)

**Rule of thumb:** **Pick DR strategy from RPO + RTO + budget.** Most companies need **Pilot Light** or **Warm Standby**. Always **automate** the recovery process and **test it quarterly** — untested backups aren't backups. Apply the **3-2-1 rule** for backups. **Immutable + cross-region** is the ransomware defense. Document runbooks in the DR region itself, not the primary.
