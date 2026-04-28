### AWS Route 53 — DNS, Routing Policies, Health Checks, ALIAS

**Definition:** AWS's managed DNS service. Beyond basic DNS, it offers **six routing policies** (latency, failover, weighted, geolocation, geoproximity, multi-value), **active health checks** that drive failover, and **ALIAS records** (AWS-only) that work at zone apex without the CNAME limitations.

**What Route 53 actually does:**

| Feature | Detail |
|---|---|
| Domain registration | Buy domains directly |
| DNS hosting | Authoritative for your records |
| Health checks | Active monitoring → failover |
| Routing policies | Smart traffic shaping |
| Private hosted zones | Internal DNS within VPCs |
| 100% availability SLA | The strongest in AWS |

**Six routing policies:**

| Policy | Selection criteria | Use case |
|---|---|---|
| **Simple** | One record, one value | Single resource, no special routing |
| **Weighted** | Random by weight (e.g., 70/30) | Canary, A/B testing, gradual rollout |
| **Latency** | Lowest-latency region for client | Global apps, multi-region |
| **Failover** | Active until unhealthy → standby | Disaster recovery |
| **Geolocation** | By user's country / continent | Content localization, compliance |
| **Geoproximity** | By distance, with bias | Traffic Flow only |
| **Multi-value** | Up to 8 healthy IPs | Simple round-robin LB |
| **IP-based** | Custom CIDR-based | Specific routing per network |

**ALIAS — the AWS-special record:**

| Property | ALIAS | CNAME |
|---|---|---|
| Works at zone apex (`example.com`) | ✅ | ❌ (DNS spec forbids) |
| Points to AWS resources | ✅ (ALB, CloudFront, S3, etc.) | Generic |
| Cost per query | Free for AWS targets | Standard |
| DNS hops | 0 (resolved internally) | 1 extra |
| Health-check integration | ✅ Auto-followed | Manual |
| Type | Pseudo (resolves to A/AAAA) | Real CNAME |

> **Use ALIAS for any AWS resource at the zone apex.** CNAMEs can't go there.

**ALIAS targets:**

| Target | Example |
|---|---|
| ALB / NLB | `my-alb-123.us-east-1.elb.amazonaws.com` |
| CloudFront distribution | `d123abc.cloudfront.net` |
| S3 website endpoint | `bucket.s3-website-us-east-1.amazonaws.com` |
| Another Route 53 record | `www.example.com` |
| API Gateway custom domain | `d-abc123.execute-api.us-east-1.amazonaws.com` |
| Elastic Beanstalk env | `myapp.us-east-1.elasticbeanstalk.com` |
| Global Accelerator | `xyz.awsglobalaccelerator.com` |
| VPC interface endpoint | PrivateLink endpoints |

**Health checks — three types:**

| Type | Detail |
|---|---|
| **Endpoint** | HTTP/HTTPS/TCP probe to your IP/hostname |
| **Calculated** | Combines other health checks (AND/OR logic) |
| **CloudWatch alarm** | Tied to any metric in CloudWatch |

**Health-check parameters:**

| Setting | Default |
|---|---|
| Interval | 30s (fast: 10s, costs more) |
| Healthy threshold | 3 consecutive successes |
| Unhealthy threshold | 3 consecutive failures |
| Timeout | 4–6s |
| Locations | 18 global checker regions |
| TCP / HTTP / HTTPS | Configurable |

**Failover routing pattern:**

```
Primary record:   api.example.com → ALB-us-east-1   (health-checked)
Secondary record: api.example.com → ALB-eu-west-1   (failover target)

Health check on us-east-1 ALB → fails →
   Route 53 returns secondary in DNS responses
   When health restores → Route 53 returns primary again
```

| Property | Detail |
|---|---|
| TTL is critical | Lower TTL = faster failover but more queries |
| Typical TTL | 60s for failover records |
| DNS caching at ISP / browser | Some clients ignore TTL |
| Combine with health-checked ALIAS | Auto failover for AWS resources |

**Latency routing:**

```
Global app deployed in 3 regions
   Route 53 measures latency to each region from each client
   Returns the lowest-latency region for that client
   Gracefully handles region failures (skip unhealthy)
```

| Property | Detail |
|---|---|
| Latency measured by AWS | Constantly updated |
| Doesn't account for cost | Just latency |
| Combine with health checks | Skip unhealthy regions |
| Use for read-heavy global apps | Each user → nearest region |

**Geolocation routing:**

| Use case | Example |
|---|---|
| Content localization | EU users → eu-content.example.com |
| Compliance | EU/UK users → EU regions only |
| Language routing | Country → localized site |
| Block specific countries | Return error or different endpoint |
| Default record | Catch-all for unmatched countries |

**Private hosted zones — internal DNS:**

```
Internal-only DNS for resources in your VPC:
  db.internal      → 10.0.1.50  (RDS endpoint)
  cache.internal   → 10.0.2.30  (ElastiCache)
  search.internal  → 10.0.3.40  (OpenSearch)
```

| Property | Detail |
|---|---|
| Resolvable only from associated VPCs | Internal isolation |
| Multiple VPCs can share | Cross-VPC resolution |
| Different from public zone | `example.com` private vs public |
| Used with VPC + Resolver Endpoints | Hybrid on-prem ↔ cloud DNS |

**TTL strategy:**

| Use case | TTL |
|---|---|
| Stable records (static IP) | Long (1h+) |
| Failover candidates | Low (60s) |
| Migrations / cutovers | Pre-lower TTL well in advance |
| `ALIAS` to internal AWS | Default OK (Route 53 controls) |
| Geo / latency policies | Default OK (already dynamic) |

**Common Route 53 use cases:**

| Pattern | How |
|---|---|
| **Active-passive failover** | Primary + Secondary failover policy with health checks |
| **Global multi-region active-active** | Latency-based routing across regions |
| **Canary / A/B** | Weighted routing (90/10 → 50/50 → 100/0) |
| **Compliance routing** | Geolocation policy |
| **Internal service discovery** | Private hosted zones |
| **Vanity domain for CloudFront** | ALIAS to distribution |
| **Apex domain for ALB** | ALIAS (CNAME can't) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| CNAME at zone apex | DNS protocol violation |
| TTL too high during failover | Slow recovery |
| TTL too low for stable records | Unnecessary queries / cost |
| Health checks point to non-public endpoint | Will fail forever |
| Latency routing without health checks | Routes to dead region |
| Geolocation default record missing | Unmatched countries get nothing |
| Mixing ALIAS to ALB and CNAME to ALB | Inconsistent behavior |
| Forgetting to associate private zone with VPC | DNS resolves nothing |
| Charging for ALIAS to non-AWS targets | ALIAS is free only for AWS |

**Pricing highlights:**

| Item | Cost |
|---|---|
| Hosted zone | $0.50/month per zone |
| Queries | $0.40 per million (first billion) |
| Health check (basic endpoint) | $0.50/month |
| Health check (HTTPS/string match) | $1+/month |
| ALIAS to AWS resources | Free queries |
| Private hosted zone queries | Charged on the VPC side |

**Decision matrix:**

| Need | Routing policy |
|---|---|
| One stable backend | Simple |
| Two regions, active-passive | Failover |
| Two regions, active-active | Latency |
| Canary deployment | Weighted |
| EU vs US users | Geolocation |
| Many backends, even split | Multi-value |
| Maximum uptime + health checks | Failover + health checks |

**Cross-references:**

- VPC + subnets: [vpc_subnets_*.md](../networking/vpc_subnets_security_groups.md)
- Disaster recovery: [disaster_recovery_*.md](../reliability_incident_management/disaster_recovery_dr.md)
- Multi-region active-active: [scaling_high_traffic_*.md](../../system_design_hld_high_level_design/fundamentals/scaling_high_traffic_horizontal_caching_redis_cdn.md)
- DNS basics: [dns_*.md](../../protocols/network/dns_resolution_a_aaaa_cname_mx_records.md)

**Rule of thumb:** **Use ALIAS over CNAME for AWS resources** — works at zone apex, free queries, follows health checks. Reach for **latency routing** for multi-region, **failover routing** for DR, **weighted** for canary, **geolocation** for compliance. Always pair routing policies with **health checks** — DNS without health awareness routes to dead servers.
