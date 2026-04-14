### AWS EBS (Elastic Block Store)

**What EBS is:**
- Block storage volumes attached to EC2 instances
- Like a virtual hard drive: persistent, independent of instance lifecycle
- Single AZ (must be in same AZ as the EC2 instance)

**Volume types:**
| Type | Category | IOPS | Throughput | Use case |
|------|----------|------|-----------|----------|
| gp3 | General SSD | 3,000 base (up to 16,000) | 125 MB/s (up to 1,000) | Most workloads (default) |
| gp2 | General SSD | Burst to 3,000 (scales with size) | 250 MB/s | Legacy, use gp3 instead |
| io2 | Provisioned SSD | Up to 64,000 | Up to 1,000 MB/s | Databases needing guaranteed IOPS |
| st1 | Throughput HDD | 500 | 500 MB/s | Big data, log processing |
| sc1 | Cold HDD | 250 | 250 MB/s | Infrequent access, cheapest |

**gp3 vs gp2:** gp3 is 20% cheaper with better baseline performance. Always use gp3.

**Snapshots:**
```bash
# Create snapshot (incremental, stored in S3)
aws ec2 create-snapshot --volume-id vol-abc123 --description "Daily backup"

# Restore: create new volume from snapshot
aws ec2 create-volume --snapshot-id snap-xyz789 --availability-zone us-east-1a

# Copy snapshot to another region (DR)
aws ec2 copy-snapshot --source-region us-east-1 --source-snapshot-id snap-xyz789 --region eu-west-1
```
- Incremental: only changed blocks are stored (cost-efficient)
- Snapshots are cross-AZ (volume from snapshot can be in any AZ in region)
- Automate with AWS Backup or DLM (Data Lifecycle Manager)

**Encryption:**
- Encrypt at rest with KMS (AES-256)
- Enable by default: `aws ec2 enable-ebs-encryption-by-default`
- Encrypted snapshots → encrypted volumes (and vice versa)
- Cannot encrypt an existing unencrypted volume directly (create encrypted snapshot → new volume)

**Multi-attach (io2 only):**
- Attach one volume to up to 16 instances simultaneously
- Use for: clustered applications that manage concurrent write access
- Rare use case, requires application-level coordination

**Rule of thumb:** Use gp3 for everything (cheaper, better than gp2). io2 only for databases needing guaranteed IOPS. Automate snapshots with DLM or AWS Backup. Encrypt by default. Snapshots for backup and cross-AZ/cross-region disaster recovery.
