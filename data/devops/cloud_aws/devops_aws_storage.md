### AWS Storage Services

**S3 (Simple Storage Service):**
- Object storage (files up to 5 TB)
- Infinite scalability, 99.999999999% (11 nines) durability
- Use for: static assets, backups, data lake, logs, artifacts

**S3 storage classes:**
| Class | Use case | Cost |
|-------|----------|------|
| Standard | Frequently accessed | Highest |
| Intelligent-Tiering | Unknown access pattern | Auto-tiers |
| Standard-IA | Infrequent access (min 30 days) | Lower storage, retrieval fee |
| Glacier Instant | Archive with ms retrieval | Low |
| Glacier Flexible | Archive, minutes-hours retrieval | Very low |
| Glacier Deep Archive | Long-term archive, 12h retrieval | Cheapest |

**S3 key features:**
- **Versioning** - keep all versions of objects (enable for important buckets)
- **Lifecycle rules** - auto-transition to cheaper classes or delete after N days
- **Encryption** - SSE-S3 (default), SSE-KMS, SSE-C (client key)
- **Bucket policy** - resource-based access control
- **Pre-signed URLs** - temporary access to private objects
- **Event notifications** - trigger Lambda/SQS/SNS on upload
- **Replication** - cross-region or same-region for DR

**EBS (Elastic Block Store):**
- Block storage attached to EC2 instances (like a hard drive)
- Types: `gp3` (general SSD), `io2` (high IOPS SSD), `st1` (throughput HDD)
- Single AZ, attached to one instance
- Snapshots for backup (stored in S3, incremental)

**EFS (Elastic File System):**
- Managed NFS, shared across multiple EC2/ECS instances
- Multi-AZ by default
- Use for: shared config, CMS uploads, ML training data
- K8s: ReadWriteMany (RWX) access mode

**S3 vs EBS vs EFS:**

| Feature | S3 | EBS | EFS |
|---------|-----|-----|-----|
| Type | Object | Block | File (NFS) |
| Access | HTTP API | Single instance | Multiple instances |
| Durability | 11 nines | 99.999% | 11 nines |
| Use case | Files, backups, static | Boot volume, DB | Shared filesystem |

**Rule of thumb:** S3 for object storage and static hosting. EBS for instance-attached storage (databases). EFS when multiple instances need shared file access. Use lifecycle policies and Intelligent-Tiering to control S3 costs.
