### Disaster Recovery (DR)

**Key metrics:**
- **RPO (Recovery Point Objective)** - max acceptable data loss (time)
  - RPO = 0: no data loss (synchronous replication)
  - RPO = 1 hour: can lose up to 1 hour of data
- **RTO (Recovery Time Objective)** - max acceptable downtime
  - RTO = 0: no downtime (active-active)
  - RTO = 4 hours: can be down up to 4 hours

**DR strategies (cost vs speed):**

| Strategy | RTO | RPO | Cost | Description |
|----------|-----|-----|------|-------------|
| Backup & Restore | Hours | Hours | Lowest | Restore from backups in new region |
| Pilot Light | 10-30 min | Minutes | Low | Core infra running, scale up on failover |
| Warm Standby | Minutes | Seconds-Minutes | Medium | Scaled-down copy running, scale up |
| Active-Active | Near zero | Near zero | Highest | Both regions serve traffic |

**Backup & Restore:**
- Regular backups to S3 (cross-region replication)
- RDS automated backups + manual snapshots
- EBS snapshots
- Terraform code can recreate infrastructure
- Cheapest but slowest recovery

**Pilot Light:**
- Core database replicated (RDS cross-region read replica)
- Infrastructure defined in Terraform (ready to apply)
- No app servers running in DR region
- On disaster: promote replica, deploy app, switch DNS

**Warm Standby:**
- Scaled-down version running in DR region
- Database replica, minimal app instances
- On disaster: scale up, promote DB, switch DNS
- Faster than pilot light, moderate cost

**Active-Active (Multi-Region):**
- Both regions serve traffic (Route53 latency/weighted routing)
- DynamoDB Global Tables or Aurora Global Database
- No failover needed (already active)
- Most complex: data consistency, conflict resolution

**Backup best practices:**
- 3-2-1 rule: 3 copies, 2 different media, 1 offsite
- Automate backups (no manual processes)
- Test restores regularly (untested backups are not backups)
- Encrypt backups at rest
- Set retention policies (cost vs compliance)
- Cross-region replication for critical data

**Testing DR:**
- Document runbooks for each failure scenario
- Regular DR drills (quarterly minimum)
- Chaos engineering: inject failures to validate recovery
- Measure actual RTO/RPO during drills

**Rule of thumb:** Choose DR strategy based on business requirements (RPO/RTO) and budget. Most companies need Pilot Light or Warm Standby. Test your DR plan - an untested plan is not a plan. Automate everything in the recovery process.
