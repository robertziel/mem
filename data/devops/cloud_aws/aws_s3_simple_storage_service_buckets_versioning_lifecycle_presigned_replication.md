### AWS S3 (Simple Storage Service)

**What S3 is:**
- Object storage with virtually unlimited scale
- 99.999999999% (11 nines) durability
- Objects up to 5 TB, unlimited objects per bucket

**Storage classes:**
| Class | Access | Retrieval | Use case |
|-------|--------|-----------|----------|
| Standard | Frequent | Instant | Active data, static hosting |
| Intelligent-Tiering | Auto-detected | Instant | Unknown access pattern |
| Standard-IA | Infrequent (min 30 days) | Instant, retrieval fee | Backups, older data |
| One Zone-IA | Infrequent, single AZ | Instant, retrieval fee | Reproducible data |
| Glacier Instant | Archive | Milliseconds | Compliance, rarely accessed |
| Glacier Flexible | Archive | Minutes to hours | Long-term backup |
| Glacier Deep Archive | Long-term | 12 hours | Regulatory archives |

**Versioning:**
```bash
aws s3api put-bucket-versioning --bucket my-bucket \
  --versioning-configuration Status=Enabled
```
- Every overwrite creates a new version (old versions retained)
- Delete adds a "delete marker" (previous versions still exist)
- Required for cross-region replication
- Adds storage cost (all versions stored)

**Lifecycle rules:**
```json
{
  "Rules": [{
    "ID": "archive-old-logs",
    "Filter": { "Prefix": "logs/" },
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER" }
    ],
    "Expiration": { "Days": 365 },
    "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
  }]
}
```

**Pre-signed URLs (temporary access):**
```ruby
s3 = Aws::S3::Client.new
presigner = Aws::S3::Presigner.new(client: s3)

# Upload URL (PUT, valid 1 hour)
upload_url = presigner.presigned_url(:put_object,
  bucket: 'my-bucket', key: 'uploads/photo.jpg', expires_in: 3600)

# Download URL (GET, valid 1 hour)
download_url = presigner.presigned_url(:get_object,
  bucket: 'my-bucket', key: 'uploads/photo.jpg', expires_in: 3600)
```
- Client uploads/downloads directly to S3 (bypasses your server)
- Use for: file uploads, private content access, time-limited shares

**Bucket policy vs IAM policy:**
- **Bucket policy**: attached to bucket, controls who can access this bucket
- **IAM policy**: attached to user/role, controls what this identity can access
- Both evaluated together: explicit deny wins

**Cross-Region Replication (CRR):**
- Async replication to another region
- Use for: disaster recovery, compliance, lower latency reads
- Requires versioning enabled on both buckets

**S3 event notifications:**
```
S3 PUT event → Lambda / SQS / SNS / EventBridge
```
- Trigger on: ObjectCreated, ObjectRemoved, ObjectRestore
- Use for: image processing, ETL, cache invalidation

**Static website hosting:**
```bash
aws s3 website s3://my-bucket --index-document index.html --error-document error.html
```
- Pair with CloudFront for HTTPS + custom domain + caching

**Encryption:**
| Type | Key management | Use when |
|------|---------------|----------|
| SSE-S3 | AWS manages (default) | Default, simplest |
| SSE-KMS | Customer-managed KMS key | Audit trail, key rotation control |
| SSE-C | Customer provides key per request | Full control, you manage keys |

**Rule of thumb:** Enable versioning on important buckets. Lifecycle rules to auto-tier and expire. Pre-signed URLs for direct client upload (don't proxy through your server). CloudFront in front for static hosting. SSE-S3 encryption is on by default. Use Intelligent-Tiering when access patterns are unpredictable.
