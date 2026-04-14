### AWS Backup & Disaster Recovery

**AWS Backup (centralized backup service):**
- Single service to manage backups across: EBS, RDS, DynamoDB, EFS, S3, EC2 AMIs, Aurora, FSx
- Backup plans: schedule, retention, lifecycle, cross-region copy
- Vault: encrypted storage for backups with access policies

**Backup plan example:**
```
Plan: production-daily
  Rule 1: Daily backup at 2 AM UTC
    - Retention: 30 days
    - Copy to: eu-west-1 (cross-region DR)
    - Lifecycle: move to cold storage after 7 days
  Rule 2: Monthly backup (1st of month)
    - Retention: 1 year
  Resources: tag "Backup=true"
```

**Per-service backup:**
| Service | Backup method | Recovery |
|---------|--------------|----------|
| EC2 | AMI snapshot | Launch from AMI |
| EBS | Volume snapshot | Create volume from snapshot |
| RDS | Automated + manual snapshots | Restore to point-in-time |
| Aurora | Continuous backup (35 days) | Restore to any second |
| DynamoDB | On-demand + continuous (PITR) | Restore to any second (35 days) |
| EFS | AWS Backup | Restore to new filesystem |
| S3 | Versioning + replication | Restore previous version |

**Cross-Region Disaster Recovery:**
```
Primary (us-east-1)              DR (eu-west-1)
  RDS Primary         →async→     RDS Read Replica (promote on failover)
  S3 Bucket           →CRR→       S3 Replica Bucket
  DynamoDB Table      →Global→    DynamoDB Global Table (active-active)
  EBS Snapshots       →copy→      EBS Snapshots
  AMIs                →copy→      AMIs
  Route53: Failover routing → switch DNS to DR region
```

**RPO/RTO by strategy:**
| Strategy | RPO | RTO | Cost |
|----------|-----|-----|------|
| Backup & Restore | Hours | Hours | Lowest |
| Pilot Light | Minutes | 10-30 min | Low |
| Warm Standby | Seconds | Minutes | Medium |
| Active-Active | Near zero | Near zero | Highest |

**AWS Elastic Disaster Recovery (DRS):**
- Continuous block-level replication from on-prem/cloud to AWS
- Low RPO (seconds), low RTO (minutes)
- Replicate servers without impacting source performance
- Test DR without disrupting production

**DR testing checklist:**
- [ ] Backup restoration tested (can you actually restore?)
- [ ] RDS point-in-time recovery tested
- [ ] Cross-region snapshot copy verified
- [ ] Route53 failover routing tested
- [ ] DR runbook documented and reviewed
- [ ] DR drill performed quarterly

**Rule of thumb:** AWS Backup for centralized backup management. Enable cross-region copy for critical data. Test your restores regularly (untested backups are not backups). RDS PITR and Aurora continuous backup are powerful — know your RPO/RTO requirements and choose the DR strategy accordingly.
