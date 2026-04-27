### AWS EFS (Elastic File System)

**What EFS is:**
- Managed NFS file system shared across multiple instances
- Multi-AZ by default (highly available)
- Auto-scales storage (no provisioning, pay for what you use)
- POSIX-compliant (standard file system semantics)

**EFS vs EBS vs S3:**
| Feature | EFS | EBS | S3 |
|---------|-----|-----|-----|
| Type | File (NFS) | Block | Object |
| Shared access | Multiple instances | Single instance* | HTTP API |
| Multi-AZ | Yes (default) | No (single AZ) | Yes |
| Auto-scaling | Yes | No (fixed size) | Yes |
| Latency | Milliseconds | Sub-millisecond | Milliseconds |
| Use case | Shared files, CMS, ML data | Boot volume, databases | Static assets, backups |

*EBS Multi-Attach exists for io2 but is rare.

**Performance modes:**
| Mode | Latency | Throughput | Use case |
|------|---------|-----------|----------|
| General Purpose | Low | Good for most workloads | Default, web serving, CMS |
| Max I/O | Higher | Highest aggregate throughput | Big data, ML training |

**Throughput modes:**
| Mode | How | Use case |
|------|-----|----------|
| Bursting | Scales with storage size | Small-medium workloads |
| Elastic | Auto-scales throughput | Spiky, unpredictable workloads |
| Provisioned | Fixed throughput | Predictable high throughput needs |

**Mount on EC2:**
```bash
# Install NFS client
sudo yum install -y amazon-efs-utils

# Mount
sudo mount -t efs -o tls fs-abc123:/ /mnt/efs

# Persistent mount (fstab)
echo "fs-abc123:/ /mnt/efs efs _netdev,tls 0 0" | sudo tee -a /etc/fstab
```

**EFS with ECS Fargate:**
```json
{
  "volumes": [{
    "name": "shared-data",
    "efsVolumeConfiguration": {
      "fileSystemId": "fs-abc123",
      "transitEncryption": "ENABLED"
    }
  }],
  "containerDefinitions": [{
    "mountPoints": [{
      "sourceVolume": "shared-data",
      "containerPath": "/mnt/shared"
    }]
  }]
}
```

**EFS with Kubernetes (EKS):**
```yaml
# PersistentVolume with EFS CSI driver
apiVersion: v1
kind: PersistentVolume
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany     # RWX - multiple pods can read/write
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-abc123
```

**Storage classes:**
| Class | Cost | Access | Use case |
|-------|------|--------|----------|
| Standard | Higher | Frequent | Active data |
| Infrequent Access (IA) | 92% lower | Infrequent | Older files, archives |

Lifecycle policy: auto-move files to IA after 30/60/90 days of no access.

**Rule of thumb:** EFS when multiple instances/containers need shared file access (CMS uploads, ML training data, shared config). EBS for single-instance storage (databases). Enable lifecycle policy to auto-tier to IA. Use `tls` mount option for encryption in transit. EFS + Fargate for shared persistent storage without managing servers.
