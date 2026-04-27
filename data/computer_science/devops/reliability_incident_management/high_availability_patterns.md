### High Availability Patterns

**Availability targets:**
| Nines | Uptime | Downtime/year | Downtime/month |
|-------|--------|---------------|----------------|
| 99% | Two nines | 3.65 days | 7.3 hours |
| 99.9% | Three nines | 8.77 hours | 43.8 minutes |
| 99.99% | Four nines | 52.6 minutes | 4.38 minutes |
| 99.999% | Five nines | 5.26 minutes | 26.3 seconds |

**Multi-AZ (Availability Zone):**
- Deploy across 2-3 AZs in the same region
- AZs are physically separate data centers
- Connected via low-latency links
- Protects against: single data center failure, power outage, network issue
- Most AWS services support Multi-AZ (RDS, ElastiCache, ECS, EKS)

**Multi-Region:**
- Deploy across 2+ AWS regions (e.g., us-east-1 + eu-west-1)
- Protects against: entire region failure, regional disasters
- Patterns: Active-Active (both serve traffic), Active-Passive (standby)
- Complexity: data replication, DNS failover, eventual consistency
- Use when: regulatory requirements, global users, >99.99% SLA

**Stateless applications:**
- Store sessions in Redis/DynamoDB, not local memory
- Store files in S3/EFS, not local disk
- Any instance can handle any request
- Enables horizontal scaling and zero-downtime deploys

**Database HA:**
- **RDS Multi-AZ** - synchronous standby, automatic failover (~30s)
- **Read replicas** - async, manual promotion, for read scaling
- **Aurora** - multi-AZ by default, auto-scaling replicas, faster failover
- **DynamoDB** - multi-AZ by default, global tables for multi-region

**Load balancer health checks:**
- Active health checks detect and remove unhealthy instances
- Connection draining: finish in-flight requests before removing
- Cross-zone load balancing: distribute evenly across AZs

**Redundancy patterns:**
- **Active-Active** - all instances serve traffic (LB distributes)
- **Active-Passive** - standby takes over on failure (failover)
- **N+1** - one extra instance beyond minimum (handles one failure)
- **N+2** - two extra (handles failure during deployment)

**Rule of thumb:** Multi-AZ is table stakes for production. Multi-region only if business requires it (adds significant complexity). Make applications stateless. Use managed services with built-in HA (RDS Multi-AZ, DynamoDB, Aurora).
