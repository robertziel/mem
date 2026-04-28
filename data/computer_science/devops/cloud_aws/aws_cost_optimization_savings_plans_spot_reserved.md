### AWS Cost Optimization (Savings Plans, Spot, Reserved, Tagging)

**Top cost categories — what bills usually look like:**

| Category | Typical share | Drivers |
|---|---|---|
| Compute (EC2, ECS, EKS, Lambda, Fargate) | 30–50% | Right-sizing, commitment, Spot ratio |
| Storage (S3, EBS, EFS, FSx) | 10–25% | Tier choice, lifecycle, snapshots |
| Data transfer (egress, NAT, cross-AZ) | 5–25% | NAT egress, public-internet egress, cross-AZ ALB |
| Database (RDS, Aurora, DynamoDB) | 10–20% | Right-sizing, RI, idle dev DBs |
| Networking (LBs, VPN, Transit Gateway) | 5–10% | LB count, TGW attachments |
| Misc (CloudWatch, Secrets Manager, KMS) | 5–10% | Log volume + retention, custom metrics |

**Pricing models — pick by workload pattern:**

| Model | Discount vs On-Demand | Use when |
|---|---|---|
| **On-Demand** | 0% | Spiky, unpredictable, short |
| **Reserved Instance** (1y/3y, no/partial/all-upfront) | 30–60% | Steady, instance-family-locked |
| **Savings Plan: Compute** | up to ~66% | Steady spend across compute (EC2 + Fargate + Lambda) |
| **Savings Plan: EC2 Instance** | up to ~72% | Steady, instance-family-locked (slightly cheaper than Compute SP) |
| **Savings Plan: SageMaker** | up to ~64% | ML workloads |
| **Spot** | 60–90% | Fault-tolerant, interruptible (batch, CI, async workers) |
| **Capacity Reservations** (no commitment) | 0% (just guarantees capacity) | Reserve capacity for known events without paying for discount |

> **Savings Plans (Compute) is the modern default** — flexibility across instance families + Fargate + Lambda for one commit. RIs only for very stable single-family usage.

**Compute strategy by workload type:**

| Workload | Strategy |
|---|---|
| Public web / API steady-state | Compute SP for baseline; On-Demand for spikes |
| Batch / ETL / CI runners | Spot |
| Scheduled jobs (nightly) | Spot or scheduled scaling |
| Database (RDS / Aurora) | RDS Reserved Instance |
| ML training | SageMaker SP + Spot for jobs |
| Inference at steady QPS | Compute SP |
| Lambda steady-rate | Compute SP covers Lambda compute |
| Bursty Lambda | On-Demand fine — Lambda is per-invocation |

**Right-sizing tooling (do this first):**

| Tool | Use |
|---|---|
| AWS Compute Optimizer | Per-resource recommendations (EC2, ECS, EBS, Lambda) |
| Trusted Advisor | Cost + performance + security checks |
| Cost Explorer | Per-service / per-tag / per-account spend |
| AWS Cost Anomaly Detection | Surprise spikes |
| `aws ce get-cost-and-usage` | Programmatic queries |
| Third-party (Vantage, Datadog Cost, Kubecost) | Multi-cloud + per-pod attribution |

**Storage cost levers — S3:**

| Tier | When |
|---|---|
| Standard | Hot data (frequent access) |
| **Intelligent-Tiering** | Unknown access patterns — auto-tiers |
| Standard-IA | Infrequent access, ms retrieval |
| One Zone-IA | Same but single-AZ — 20% cheaper, lower durability |
| Glacier Instant Retrieval | Rarely accessed, ms retrieval |
| Glacier Flexible Retrieval | Archive — minutes-to-hours retrieval |
| Glacier Deep Archive | Cheapest — 12+ hour retrieval |

**S3 lifecycle pattern (canonical):**

```
Day 0:    Standard
Day 30:   Standard-IA  (or Intelligent-Tiering)
Day 90:   Glacier Flexible
Day 365:  Glacier Deep Archive
Day 2555 (7y): Expire
```

**EBS cost levers:**

| Volume type | Use |
|---|---|
| **gp3** | **Default** — cheaper than gp2 + tunable IOPS/throughput |
| gp2 | Legacy (migrate to gp3) |
| io2 / io2 Block Express | High-IOPS DBs |
| st1 / sc1 | Throughput / cold sequential workloads |
| io1 | Legacy (use io2) |

| Concern | Win |
|---|---|
| Migrate gp2 → gp3 | ~20% cheaper at same IOPS |
| Delete unattached volumes | Cost without value |
| Delete old snapshots | Snapshots compound over time |
| Snapshot lifecycle (DLM) | Auto-rotate |
| Encrypted by default | Compliance + nominal cost |

**RDS cost levers:**

| Lever | Effect |
|---|---|
| Reserved Instance (1y/3y) | 40–60% off |
| Aurora Serverless v2 | Pay per ACU; great for variable load |
| Right-size primary | Per Compute Optimizer |
| Stop dev DBs at night | Manual or scheduled |
| Read replicas only when needed | They cost as much as primaries |
| Deletion protection + automated backups | Avoid accidental + expensive recreation |
| Migrate to Aurora I/O-Optimized | Pricing model better for write-heavy |

**DynamoDB cost levers:**

| Mode | Use |
|---|---|
| **On-Demand** | Spiky, unpredictable; no capacity planning |
| Provisioned + Auto Scaling | Steady, predictable; cheaper at scale |
| **DynamoDB Reserved Capacity** (provisioned only) | 40–80% off long commitments |
| TTL | Free deletes; no WCU charged |
| Tiered TTL → S3 archive | Move cold data out |
| GSI projection (`KEYS_ONLY` / `INCLUDE`) | Smaller indexes; lower WCU |

**Data transfer — the sneaky cost killer:**

| Source | Cost |
|---|---|
| Internet egress | Tier-based; expensive (~$0.09/GB after free tier) |
| Cross-AZ in same region | $0.01/GB each direction (both sides pay) |
| Cross-region | $0.02/GB+ |
| Inter-VPC peering | Same as cross-AZ |
| **NAT Gateway processing** | $0.045/GB **+ hourly** — **the surprise on most bills** |
| VPC endpoint (S3, DynamoDB Gateway) | Free traffic in-region |
| VPC endpoint (Interface, AWS PrivateLink) | Hourly + per-GB; cheaper than NAT for AWS service traffic |

**Tactics:**

| Tactic | Win |
|---|---|
| **VPC endpoints for S3/DynamoDB** | Free traffic, no NAT |
| **PrivateLink endpoints for AWS services** (`logs`, `ecr`, `secretsmanager`...) | Avoid NAT egress |
| Replace NAT Gateway with NAT instance for low-traffic workloads | Trade availability for cost (rare) |
| Same-AZ traffic | Cheaper than cross-AZ |
| CloudFront in front of S3 / origin | Caches reduce egress |
| Compression / dedup | Less bytes |
| Use S3 Transfer Acceleration only when needed | Premium |

**Logging / monitoring cost:**

| Concern | Lever |
|---|---|
| CloudWatch Logs ingest | $0.50/GB — expensive at scale |
| Log retention | Set explicit retention; default is forever |
| Custom metrics | $0.30/metric/month — caps surprise quickly |
| CloudWatch Insights queries | Per-GB scanned |
| Alternatives | Send logs to S3 + Athena; metrics to Prometheus |
| Log filtering / sampling | Dropping noise saves real money |

**Lambda cost considerations:**

| Concern | Lever |
|---|---|
| Memory size | More memory = more CPU + cost; right-size with `aws lambda tune` style tools |
| ARM64 (Graviton) | ~20% cheaper than x86 |
| Provisioned concurrency | Pay even when idle — only for latency-critical |
| Compute Savings Plan covers Lambda | Discount automatically |
| Cold-start optimization | Shorter init = less billed time |

**Tagging — the foundation of cost allocation:**

| Tag | Use |
|---|---|
| `team` | Owner team |
| `service` | Service name |
| `environment` | `prod` / `staging` / `dev` |
| `cost_center` | Finance allocation |
| `project` | Initiative |
| `tier` | `tier1` (critical) / `tier2` / `tier3` |

| Practice | Detail |
|---|---|
| Activate tags as **cost allocation tags** in Billing | They show up in Cost Explorer |
| Enforce required tags via SCP / Service Catalog | Don't allow untagged resources |
| Auto-tag from CI / IaC | Don't rely on humans |
| Use tag-based access (ABAC) | Same tags drive both cost + access |

**Budgets + anomaly detection:**

| Tool | Use |
|---|---|
| **AWS Budgets** | Alert on spend > threshold; per-account / per-tag / per-service |
| **Cost Anomaly Detection** | ML detects unusual spikes |
| **Forecasting** in Cost Explorer | Predict month-end |
| **Per-account budgets** | Catch surprise dev environments |

**Quick-wins checklist (ranked by typical impact):**

| Action | Typical win |
|---|---|
| Compute Savings Plan for steady spend | 10–30% on compute |
| Right-size over-provisioned EC2 / RDS | 10–20% on those |
| S3 lifecycle policies on old data | 30–80% on log buckets |
| VPC endpoints for S3 + AWS services | Cuts NAT bills significantly |
| Delete unattached EBS + old snapshots | Compound cleanup |
| Spot for CI runners / batch | 70%+ on those |
| ARM (Graviton) where supported | ~20% |
| Stop dev / non-prod nights + weekends | 70% on those resources |
| gp2 → gp3 EBS migration | 20% on EBS |
| CloudWatch Logs retention + filter | 50%+ on log spend |
| RDS Reserved Instances for prod | 40–60% on those |
| Decommission unused environments | 100% on those |

**Multi-account cost strategy:**

| Practice | Detail |
|---|---|
| AWS Organizations consolidated billing | Volume discounts pooled |
| Per-team accounts | Clear cost ownership |
| Tag every resource | Allocation visible |
| Cost Explorer per-account | Spot anomalies |
| Cost Anomaly Detection org-wide | Catch surprises |
| Centralize log archive | Reduces duplicate spend |
| Reserved Instance / SP sharing across org | Org-wide utilization |

**Spot best practices:**

| Practice | Detail |
|---|---|
| Diversify across instance families + AZs | Reduce simultaneous interruption |
| Handle 2-min interruption notice | Drain gracefully |
| Use **Capacity-Optimized** allocation strategy | Lowest interruption rates |
| Mix Spot + On-Demand in ASG | Floor of stability |
| Don't use Spot for stateful single-replica services | One interruption = outage |
| EKS Karpenter | Modern Spot-aware K8s autoscaler |
| Fargate Spot | Same idea for ECS |

**Reserved Capacity vs Savings Plans (which to pick):**

| Concern | Reserved | Savings Plan |
|---|---|---|
| Instance family lock-in | RI: yes | Compute SP: no |
| Region lock-in | Yes | Yes (per-region) |
| Switch family / size | RI: limited (size flexibility within family) | SP: free |
| Apply to Fargate / Lambda | No | Compute SP: yes |
| Discount | RI: slightly higher | Compute SP: very close |
| Modern recommendation | Niche (single-family-stable workloads) | **Default for compute** |

**Container / K8s cost levers:**

| Concern | Lever |
|---|---|
| EKS control plane | Flat fee (~$0.10/hr) — usually small line |
| EKS node groups on Spot | Significant savings |
| Karpenter | Auto-binpack; Spot-aware; less Cluster Autoscaler config |
| Fargate Spot | For non-critical pods |
| **Resource requests = actual usage** | Wasted requests = wasted nodes |
| Per-pod / per-namespace cost (Kubecost) | Visibility |
| HPA + cluster autoscaler tuned | Don't keep idle nodes |
| Pause / scale dev clusters off-hours | Big savings on dev |

**FinOps maturity ladder:**

| Level | Behavior |
|---|---|
| **Crawl** | Tagging baseline, monthly bill review |
| **Walk** | Cost dashboards per team, budgets + alerts |
| **Run** | Real-time anomaly detection, RI/SP discipline, per-pod attribution, monthly FinOps reviews |
| **Sprint** | Cost-as-a-feature in design, per-feature cost analysis, automated waste cleanup |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Untagged resources | Can't allocate cost |
| Public S3 / NAT-routed traffic | Egress bill explodes |
| Over-provisioned RDS in dev | Costs match prod |
| Reserved Instances bought for the wrong family | Locked-in waste |
| Snapshots that compound forever | Quiet bill creep |
| Logs without retention | CloudWatch grows forever |
| Long-running ECR images | Registry bill grows |
| Forgotten test environments | Each costs prod-level money |
| Custom CloudWatch metrics fan-out | Per-metric pricing surprises |
| Spot for stateful single-replica services | Outage on interruption |
| Saving Plan / RI underutilization | Wasted commitment |

**Reporting cadence — what to look at and when:**

| Frequency | Look at |
|---|---|
| Daily | Anomaly Detection alerts, budget burn |
| Weekly | Top movers (services + tags) |
| Monthly | Full Cost Explorer review per team / service |
| Quarterly | Re-evaluate Savings Plan / RI commitments |
| Per-incident | Did the outage / fix cost more than expected? |

**Tooling map:**

| Tool | Use |
|---|---|
| AWS Cost Explorer | Native dashboards |
| AWS Budgets + Anomaly Detection | Alerts |
| AWS Compute Optimizer | Right-sizing |
| AWS Trusted Advisor | Multi-axis recommendations |
| **Kubecost / OpenCost** | Per-pod / per-namespace cost |
| **Vantage / CloudHealth / Apptio Cloudability** | Multi-account / multi-cloud |
| **Datadog Cloud Cost Mgmt** | If already using Datadog |
| **Infracost** | Cost diff in PRs (Terraform) |
| **Spot.io / nOps** | Automated Spot orchestration |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Tagging policy enforced | ✅ |
| Compute SP covering steady spend | ✅ |
| Spot for fault-tolerant workloads | ✅ |
| RDS RI for production DBs | ✅ |
| S3 lifecycle policies on log / archive buckets | ✅ |
| VPC endpoints for S3 + frequently-used AWS services | ✅ |
| CloudWatch Logs retention set | ✅ |
| Custom metrics audited periodically | ✅ |
| Unattached volumes / old snapshots cleaned | ✅ |
| Budgets + anomaly detection on every account | ✅ |
| Dev / staging stopped overnight | ✅ |
| Per-team / per-service Cost Explorer dashboards | ✅ |

**Rule of thumb:** **tag everything from day one** (otherwise you can't allocate). **Compute Savings Plan for the baseline, Spot for the flexible, On-Demand for the rest.** Watch the **sneaky three**: NAT Gateway egress, cross-AZ traffic, and CloudWatch Logs ingest. Right-size **before** committing — Compute Optimizer pays for itself. Review **weekly**, re-commit **quarterly**.
