### AWS Route53 (DNS)

**What Route53 does:**
- Managed DNS service (domain registration + DNS hosting + health checks)
- 100% availability SLA

**Routing policies:**
| Policy | How | Use case |
|--------|-----|----------|
| Simple | One record, one value | Single resource |
| Weighted | Split traffic by weight (70/30) | Canary, A/B testing |
| Latency | Route to lowest-latency region | Global apps, multi-region |
| Failover | Active-passive with health checks | Disaster recovery |
| Geolocation | Route by user's country/continent | Content localization, compliance |
| Multi-value | Return multiple healthy IPs | Simple load balancing |

**ALIAS record (AWS-specific):**
- Works at zone apex (`example.com`, not just `www.example.com`)
- Points to AWS resources: ALB, CloudFront, S3 website, another Route53 record
- Free (no charges for ALIAS queries to AWS resources)
- Unlike CNAME: works at apex, no extra DNS hop

```
example.com → ALIAS → d123.cloudfront.net (CloudFront)
example.com → ALIAS → my-alb-123.us-east-1.elb.amazonaws.com (ALB)
```

**Health checks:**
```
Route53 health checkers → poll your endpoint every 10 or 30 seconds
Healthy: 3 consecutive successes
Unhealthy: 3 consecutive failures
→ Remove unhealthy from DNS responses
→ Trigger failover routing
```
- HTTP/HTTPS/TCP health checks
- Can check: endpoint, other health checks (calculated), CloudWatch alarm
- Global health checkers from multiple regions

**Failover routing:**
```
Primary:   api.example.com → ALB in us-east-1 (health check: /health)
Secondary: api.example.com → ALB in eu-west-1 (failover target)

If primary health check fails → DNS returns secondary
```

**Private hosted zones:**
```
Internal DNS within your VPC:
  db.internal → 10.0.1.50 (RDS endpoint)
  cache.internal → 10.0.2.30 (ElastiCache)

Only resolvable from within the associated VPC(s).
```

**Rule of thumb:** ALIAS over CNAME for AWS resources (works at apex, free). Use latency routing for multi-region. Failover routing + health checks for DR. Private hosted zones for internal service discovery. Route53 health checks are the trigger for failover, not just monitoring.
