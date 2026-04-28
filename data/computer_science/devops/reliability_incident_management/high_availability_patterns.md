### High Availability Patterns

**Definition:** **High availability (HA)** = the ability to continue serving traffic during failures. Practically: **multi-AZ for AZ failures, multi-region for region failures, stateless apps + replicated databases + automated failover** for the rest. The cost grows fast — pick the level your business actually needs.

**Availability targets — what each "nine" buys:**

| Nines | Uptime | Downtime / year | Downtime / month |
|---|---|---|---|
| **99%** ("two nines") | 99% | 3.65 days | 7.3 hours |
| **99.9%** ("three nines") | 99.9% | 8.77 hours | 43.8 minutes |
| **99.99%** ("four nines") | 99.99% | 52.6 minutes | 4.38 minutes |
| **99.999%** ("five nines") | 99.999% | 5.26 minutes | 26.3 seconds |
| 99.9999% | 99.9999% | 31.5 seconds | 2.6 seconds |

**Cost vs nines (rough):**

| Nines | Required investment |
|---|---|
| 99% | Single instance, manual restart |
| 99.9% | Multi-AZ + auto-restart |
| 99.99% | Multi-AZ + automatic failover + tested runbooks |
| 99.999% | Multi-region + automatic failover + chaos drills |
| 99.9999% | Aerospace-grade — usually unrealistic for SaaS |

**The HA layers — checklist:**

| Layer | Single | HA |
|---|---|---|
| **Compute** | One EC2 / pod | Multi-AZ ASG / HPA |
| **Database** | Single primary | Multi-AZ + read replicas |
| **Cache** | Single Redis | ElastiCache cluster + replicas |
| **Load balancer** | Standalone | ALB / NLB cross-AZ |
| **Storage** | EBS | S3 (multi-AZ by default) |
| **DNS** | Single record | Route 53 health-checked |
| **Region** | One region | Multi-region |
| **Sessions** | Local memory | Redis / DynamoDB |
| **Files** | Local disk | S3 / EFS |
| **Logs** | Local file | Centralized (CloudWatch / Datadog) |

**Multi-AZ — table stakes for production:**

```
   Region (us-east-1)
     ┌───────────────────────────┐
     │  AZ-a  AZ-b  AZ-c           │
     │   ●     ●     ●              │
     │   |     |     |              │
     │   App   App   App            │
     │   pod   pod   pod            │
     └─────────────────────────────┘
```

| Property | Detail |
|---|---|
| 2–3 AZs in same region | Physical separation |
| Connected via low-latency fiber | < 1ms typically |
| Survives | Single AZ failure, power outage |
| Most AWS services support Multi-AZ | RDS, ElastiCache, ECS, EKS, ALB |
| Cost overhead | Cross-AZ data transfer ($) |

**Multi-region — when business demands:**

```
   ┌───────────────────────┐         ┌───────────────────────┐
   │ us-east-1             │ ◄─────► │ eu-west-1             │
   │  - App                  │  data   │  - App                  │
   │  - DB primary           │ replica │  - DB replica           │
   └───────────┬───────────┘         └───────────┬───────────┘
               │                                 │
               └─────── Route53 ─────────────────┘
                       (health-checked failover or latency routing)
```

| Property | Detail |
|---|---|
| 2+ regions | E.g., us-east-1 + eu-west-1 |
| Survives | Region failure, regional disaster |
| Patterns | Active-Active, Active-Passive, Pilot Light |
| Complexity | Data replication, conflict resolution, eventual consistency |
| Use cases | Regulatory, global users, > 99.99% SLA |

**Active-Active vs Active-Passive:**

| Pattern | Active-Active | Active-Passive |
|---|---|---|
| Both regions serve traffic | ✅ | ❌ (one standby) |
| Failover time | None | Seconds to minutes |
| Cost | 2× compute always | 1× + standby capacity |
| Complexity | Highest (data conflicts) | Medium |
| Used by | Large-scale SaaS | Most enterprises |

**Stateless application — the prerequisite:**

| Without | With (stateless) |
|---|---|
| Sessions in local memory | Sessions in Redis / DynamoDB |
| Files on local disk | Files in S3 / EFS |
| Sticky LB sessions required | Any pod handles any request |
| Hard to scale | Trivial to autoscale |
| Hard to redeploy | Zero-downtime |

**Database HA strategies:**

| DB | HA Mechanism |
|---|---|
| **RDS Multi-AZ** | Synchronous standby, automatic failover (~30s) |
| **RDS Read Replica** | Async, manual promotion |
| **Aurora** | Multi-AZ default, auto-scaling replicas, faster failover |
| **DynamoDB** | Multi-AZ default; Global Tables for multi-region |
| **Redis (ElastiCache)** | Cluster mode + replicas |
| **Postgres self-managed** | Patroni, Stolon, pglogical |
| **Kafka** | Replication factor ≥ 3 |

**Health checks — types:**

| Type | What | Purpose |
|---|---|---|
| **Liveness** | Is the process responsive? | Restart if not |
| **Readiness** | Ready for traffic? | Don't route until passing |
| **Startup** | Still starting? | Slower probes initially |
| **Active health check** (LB → backend) | LB pings `/health` | Eject unhealthy |
| **Passive health check** | LB observes failures | Eject after threshold |
| **Synthetic monitoring** (external) | External call to user-facing URL | End-to-end |

**Connection draining / graceful shutdown:**

| Phase | Action |
|---|---|
| 1. Mark pod unhealthy | LB stops routing new connections |
| 2. Wait for in-flight to complete | Up to drain timeout (~30s) |
| 3. Send SIGTERM to app | App finishes pending work |
| 4. Force kill if needed | After grace period |

**Redundancy patterns:**

| Pattern | Detail |
|---|---|
| **Active-Active** | All replicas serve traffic; LB distributes |
| **Active-Passive** | Standby takes over on failure |
| **N+1** | One extra beyond minimum (handles 1 failure) |
| **N+2** | Two extra (handles failure during deployment) |
| **Quorum** | Majority of N (Raft, Paxos) |

**Automatic failover — the moving parts:**

| Component | Detail |
|---|---|
| Detection | Health check threshold |
| Promotion | New primary chosen |
| Routing update | DNS / LB / proxy |
| Failback | Manual or automatic |
| Split-brain prevention | Quorum / fencing |

**Cross-zone load balancing:**

| Setting | Detail |
|---|---|
| Distribute evenly across AZs | Default for ALB |
| Avoids hot AZ | Otherwise one AZ saturates |
| Cross-AZ data costs | Watch for it |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Single AZ deployment for prod | Easy outage |
| Sticky sessions tied to local memory | Can't autoscale |
| One region for compliance-flexible workloads | Regional outage = downtime |
| No graceful shutdown | Drops connections during deploy |
| Replicated DB but writes to wrong replica | Data divergence |
| Health check that's just "process running" | Doesn't catch real issues |
| Health check too aggressive | Flapping |
| Health check too lax | Bad pods serve traffic |
| 99.99% SLA without runbooks | Empty promise |

**HA testing — chaos engineering:**

| Practice | Detail |
|---|---|
| **Chaos Monkey** (Netflix) | Kill random instances |
| **Game days** | Scheduled chaos exercises |
| **Region failover drills** | Quarterly minimum |
| **Latency injection** | Test timeouts |
| **Database failover testing** | Verify it actually works |
| **Tabletop exercises** | Walk through scenarios |

> An HA design that hasn't been tested is just a hypothesis.

**Decision matrix:**

| Need | Pattern |
|---|---|
| Internal tool, low criticality | Single AZ + monitoring |
| Standard production | Multi-AZ |
| Customer-facing, > 99.9% SLA | Multi-AZ + automatic failover |
| Regulatory cross-region requirement | Multi-region active-passive |
| Global low-latency users | Multi-region active-active |
| Compliance like 6+ nines required | Specialty (often hardware/carrier-grade) |

**Cross-references:**

- Disaster recovery: [disaster_recovery_*.md](disaster_recovery_dr.md)
- Incident response: [incident_response_*.md](incident_response.md)
- Multi-region architecture: [scaling_high_traffic_*.md](../../system_design_hld_high_level_design/fundamentals/scaling_high_traffic_horizontal_caching_redis_cdn.md)
- Chaos engineering: [chaos_*.md](../../distributed_systems/chaos_engineering_failure_injection.md)

**Rule of thumb:** **Multi-AZ is table stakes for production.** Multi-region only if business genuinely needs it (significantly more complexity). **Make apps stateless** so any instance handles any request. **Use managed services with built-in HA** (RDS Multi-AZ, DynamoDB, Aurora, S3) — they encode operational expertise you don't have to build. **Test failover regularly** — an untested HA design is wishful thinking.
