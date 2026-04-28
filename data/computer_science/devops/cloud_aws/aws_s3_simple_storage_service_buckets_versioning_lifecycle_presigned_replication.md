### AWS S3 — Buckets, Versioning, Lifecycle, Presigned URLs, Replication

**Definition:** **S3** = AWS's object storage. **11 nines durability** (`99.999999999%`), virtually unlimited scale, objects up to 5 TB. The workhorse for backups, static hosting, data lakes, and data ingestion. Critical features: storage classes, versioning, lifecycle, presigned URLs, replication, encryption.

**S3 fundamentals:**

| Property | Detail |
|---|---|
| Object storage (not file system) | Flat key-value: `bucket/key → bytes` |
| Bucket name globally unique | Across all AWS accounts |
| Object size | Up to 5 TB |
| Objects per bucket | Unlimited |
| Durability | 99.999999999% (11 nines) |
| Availability | 99.99% (Standard) |
| Eventually consistent → strong | Read-after-write strong since 2020 |

**Storage classes — eight tiers:**

| Class | Access | Min duration | Retrieval | Use case |
|---|---|---|---|---|
| **Standard** | Frequent | None | Instant | Active data, static hosting |
| **Intelligent-Tiering** | Auto-detected | 30 days | Instant | Unknown / variable patterns |
| **Standard-IA** | Infrequent | 30 days | Instant + retrieval fee | Backups, older data |
| **One Zone-IA** | Infrequent, single AZ | 30 days | Instant + retrieval fee | Reproducible data |
| **Glacier Instant** | Archive | 90 days | **ms** | Compliance, rarely accessed |
| **Glacier Flexible** | Archive | 90 days | Minutes-hours | Long-term backup |
| **Glacier Deep Archive** | Long-term | 180 days | **12 hours** | Regulatory archives |
| **Express One Zone** | Ultra-low latency | None | Sub-ms | Hot AI training data |

**Cost vs access trade-off:**

```
Highest cost,     ▲       Standard
fastest access     │       Standard-IA / Intelligent-Tiering
                  │       One Zone-IA
                  │       Glacier Instant
                  │       Glacier Flexible
Lowest cost,      ▼       Glacier Deep Archive
slowest access
```

**Versioning:**

```bash
aws s3api put-bucket-versioning --bucket my-bucket \
  --versioning-configuration Status=Enabled
```

| Property | Detail |
|---|---|
| Every overwrite creates new version | Old versions retained |
| Delete creates a "delete marker" | Previous versions still exist |
| Required for cross-region replication | And object lock |
| Adds storage cost | Per version |
| MFA-delete prevents accidental delete | Strong protection |
| Object Lock for legal hold / WORM | Immutable |

**Lifecycle rules — auto-tier and expire:**

```json
{
  "Rules": [{
    "ID": "archive-old-logs",
    "Filter": { "Prefix": "logs/" },
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "Expiration": { "Days": 1095 },
    "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}
```

| Action | Detail |
|---|---|
| `Transitions` | Move to cheaper class after N days |
| `Expiration` | Delete object |
| `NoncurrentVersionExpiration` | Cleanup old versions |
| `AbortIncompleteMultipartUpload` | Drop stuck uploads |
| Filter by prefix or tag | Per-pattern policy |

**Presigned URLs — direct client access:**

```ruby
s3 = Aws::S3::Client.new
presigner = Aws::S3::Presigner.new(client: s3)

# Upload URL (PUT)
upload_url = presigner.presigned_url(:put_object,
  bucket: 'my-bucket', key: 'uploads/photo.jpg', expires_in: 3600)

# Download URL (GET)
download_url = presigner.presigned_url(:get_object,
  bucket: 'my-bucket', key: 'uploads/photo.jpg', expires_in: 3600)
```

| Use case | Detail |
|---|---|
| Direct client upload | Bypass app server |
| Time-limited download | Private content sharing |
| Form-based upload (POST) | HTML form submission |
| Conditional upload | Only-if-not-exists |

**Permissions — bucket policy vs IAM:**

| Property | Bucket Policy | IAM Policy |
|---|---|---|
| Attached to | Bucket | User / Role / Group |
| Controls | Who can access this bucket | What this identity can access |
| Cross-account | Yes (resource-based) | Yes (with sts:AssumeRole) |
| Combined evaluation | Both checked; **explicit deny wins** | Both checked |
| Use case | Public read, cross-account sharing | Application access |

**Block Public Access — modern default:**

| Setting | Effect |
|---|---|
| BlockPublicAcls | New ACLs can't grant public |
| IgnorePublicAcls | Existing public ACLs ignored |
| BlockPublicPolicy | New bucket policies can't grant public |
| RestrictPublicBuckets | Existing public bucket policies ignored |
| **All four = best** | "Account-level block public access" |

> Default for new buckets (2023+) is all four enabled. Override carefully — only for known-public hosting use cases.

**Cross-Region Replication (CRR) and Same-Region Replication (SRR):**

| Property | Detail |
|---|---|
| Async replication | Within minutes |
| Both buckets need versioning | Required |
| Filter by prefix or tag | Selective |
| Different storage class | Allowed in destination |
| KMS encryption replicated | If both buckets encrypted |
| Use cases | DR, compliance, low-latency global reads |
| Two-way replication | Multi-region active-active |

**Replication setup:**

```json
{
  "Role": "arn:aws:iam::123:role/s3-replication-role",
  "Rules": [{
    "Status": "Enabled",
    "Priority": 1,
    "DeleteMarkerReplication": { "Status": "Enabled" },
    "Filter": { "Prefix": "important/" },
    "Destination": {
      "Bucket": "arn:aws:s3:::my-replica-bucket",
      "StorageClass": "GLACIER",
      "EncryptionConfiguration": {
        "ReplicaKmsKeyID": "arn:aws:kms:us-east-1:..."
      }
    }
  }]
}
```

**S3 Event Notifications:**

| Event | Targets | Use case |
|---|---|---|
| `ObjectCreated:*` | Lambda / SQS / SNS / EventBridge | Image processing, ETL trigger |
| `ObjectRemoved:*` | Same | Cache invalidation |
| `ObjectRestore:*` | Same | After Glacier restore |
| `ReducedRedundancyLostObject` | Same | (rare) |

**Static website hosting:**

```bash
aws s3 website s3://my-bucket --index-document index.html --error-document error.html
```

| Pair with | For |
|---|---|
| **CloudFront** | HTTPS, custom domain, caching |
| Route 53 ALIAS | Apex domain |
| Bucket policy `s3:GetObject` for `*` | Public-read needed |
| Origin Access Control (OAC) | Restrict bucket to CloudFront only |

**Encryption:**

| Type | Key management | Detail |
|---|---|---|
| **SSE-S3** (AES-256) | AWS-managed | Default; simplest |
| **SSE-KMS** | Customer KMS key | Audit trail; key rotation; cross-account |
| **SSE-C** | Customer-provided | You manage keys; per-request |
| **DSSE-KMS** | Dual-layer | Compliance (DoD-grade) |
| Bucket-default encryption | Enable on bucket | All new objects encrypted |

**Optimization tactics:**

| Tactic | Detail |
|---|---|
| **Multipart upload** for > 100 MB | Faster, resumable, parallel |
| **S3 Transfer Acceleration** | CloudFront edge for upload |
| **Range GETs** | Partial reads of large objects |
| **Request rates** | 3,500 PUT / 5,500 GET per partitioned prefix |
| **Use UUIDs / hash prefixes** | Avoid hot partition (less critical post-2018) |
| **S3 Batch Operations** | Bulk processing |
| **Storage Lens** | Account-wide analytics |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Public ACL by accident | Data leak |
| No lifecycle policy | Unbounded cost |
| Versioning + no expiration | Old versions multiply storage |
| `s3 cp` for huge files | Use `s3 cp` with multipart auto |
| Forgetting `--storage-class` | All Standard, expensive |
| Cross-region without versioning | Replication won't work |
| Hot prefix (millions of objects with same prefix) | Throttling |
| Storing tiny files | Per-request cost dominates |
| Public bucket as static site | Use OAC + CloudFront instead |
| KMS key in different region | Replication fails |

**Cost components:**

| Item | Pricing |
|---|---|
| Storage | $/GB/month per class |
| Requests | PUT/COPY/POST $$, GET $ |
| Data transfer out | $/GB (free within AWS to same region) |
| Replication | Storage + cross-region transfer |
| KMS encryption | KMS request fee |
| Lifecycle transitions | Per-object fee |

**Decision matrix:**

| Need | Storage class |
|---|---|
| Active data, frequent access | **Standard** |
| Unknown access pattern | **Intelligent-Tiering** |
| Backups, accessed monthly | **Standard-IA** |
| Compliance archives, occasional | **Glacier Instant** |
| Long-term archive, rarely | **Glacier Deep Archive** |
| Hot AI / ML training | **Express One Zone** |
| Reproducible data, single AZ OK | **One Zone-IA** |

**Cross-references:**

- AWS EBS (block vs object): [aws_ebs_*.md](aws_ebs_elastic_block_store_volumes_gp3_io2_snapshots_encryption.md)
- CloudFront (CDN in front of S3): [cloudfront_*.md](cloudfront_cdn_origins_distributions_invalidation.md)
- IAM + bucket policies: [iam_*.md](iam_roles_policies_least_privilege.md)
- Disaster recovery (3-2-1 + cross-region): [disaster_recovery_*.md](../reliability_incident_management/disaster_recovery_dr.md)

**Rule of thumb:** **Enable versioning + lifecycle on important buckets** (auto-tier and expire). **Block Public Access by default**. Use **presigned URLs** for direct client upload/download (don't proxy through your server). **CloudFront in front of S3** for static hosting (HTTPS + caching). **SSE-S3 encryption is on by default** — bump to **SSE-KMS** for audit / cross-account / compliance. Use **Intelligent-Tiering** when access patterns are unknown.
