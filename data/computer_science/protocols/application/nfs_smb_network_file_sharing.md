### NFS & SMB — Network File Sharing

**Definition:** two protocols for **mounting remote filesystems**. **NFS** is the Unix/Linux standard (port 2049); **SMB/CIFS** is the Windows/Active Directory standard (port 445). In cloud environments, prefer managed services (**EFS** for NFS, **FSx for Windows** for SMB) over self-hosted file servers — and prefer **object storage (S3)** when you don't need filesystem semantics.

**Side-by-side: NFS vs SMB:**

| Property | **NFS** | **SMB / CIFS** |
|---|---|---|
| Native platform | Unix / Linux | Windows / Active Directory |
| Port | **2049** | **445** (legacy 139 NetBIOS) |
| Performance | Generally faster on Linux | Generally faster on Windows |
| Security | Kerberos (NFSv4), IP-based (NFSv3) | NTLM, Kerberos, user-based ACLs |
| Authentication | UID/GID-based, Kerberos | User-based |
| Caching | Client + server caching | Opportunistic locking |
| Stateful | NFSv3: stateless; NFSv4: stateful | Stateful |
| Best for | Linux servers, containers, HPC | Windows environments, AD |
| Cloud managed | AWS EFS, GCP Filestore | AWS FSx for Windows |

**NFS protocol versions:**

| Version | Features |
|---|---|
| **NFSv3** | Stateless, widely supported, UDP or TCP, separate ports for various services |
| **NFSv4** | Stateful, built-in Kerberos, **TCP only**, single port (firewall-friendly) |
| **NFSv4.1** | Parallel NFS (pNFS), session trunking |
| **NFSv4.2** | Server-side copy, sparse files, holes |
| Recommendation | NFSv4.1+ for new deployments |

**NFS server / client setup:**

```bash
# Server: export a directory
echo "/shared 10.0.1.0/24(rw,sync,no_subtree_check,no_root_squash)" >> /etc/exports
exportfs -ra
systemctl reload nfs-server

# Client: mount the share
mount -t nfs server:/shared /mnt/shared

# Persistent in /etc/fstab
server:/shared /mnt/shared nfs defaults,_netdev 0 0
```

**NFS export options (the big ones):**

| Option | Effect |
|---|---|
| `rw` / `ro` | Read-write or read-only |
| `sync` | Confirm write to disk before ACK (safer, slower) |
| `async` | ACK before disk (faster, risky) |
| `no_root_squash` | Allow remote root | (security risk) |
| `root_squash` (default) | Map remote root → nobody |
| `no_subtree_check` | Faster, less safe |
| `sec=krb5p` | Kerberos with privacy (encryption) |
| `nohide` | Submount visibility |

**NFS mount options:**

| Option | Effect |
|---|---|
| `hard` (default) | Block on server failure (retry indefinitely) |
| `soft` | Return error after timeout |
| `intr` | Allow interrupt during hard mount (legacy) |
| `nfsvers=4.1` | Specific version |
| `tcp` | TCP transport (default for v4) |
| `rsize=1048576`, `wsize=1048576` | Read/write block size |
| `noatime` | Don't update access times (performance) |
| `nolock` | Disable locking (rare) |

**SMB versions:**

| Version | Detail |
|---|---|
| **SMB1 / CIFS** | Old, **disable** (WannaCry vulnerability) |
| **SMB2** | Better perf, signing, durable handles |
| **SMB3** | Encryption, multichannel, scale-out |
| **SMB3.1.1** | Latest, mandatory encryption signing |
| Recommendation | SMB3+ only |

**SMB client mount (Linux):**

```bash
# Mount Windows / Samba share
sudo mount -t cifs //server/share /mnt/share \
  -o username=user,password=pass,vers=3.1.1

# Better: credentials file with restricted permissions
sudo mount -t cifs //server/share /mnt/share \
  -o credentials=/root/smb-creds,vers=3.1.1

# Interactive smbclient
smbclient //server/share -U user
```

**AWS managed file storage options:**

| Service | Protocol | Use case |
|---|---|---|
| **EFS** | NFS v4.1 | Linux workloads, containers, Lambda |
| **FSx for Windows** | SMB | Windows apps, AD-integrated |
| **FSx for Lustre** | Lustre (POSIX-like) | HPC, ML training (high throughput) |
| **FSx for NetApp ONTAP** | NFS + SMB | Multi-protocol, enterprise |
| **FSx for OpenZFS** | NFS | ZFS features (snapshots, cloning) |

**NFS vs SMB vs S3:**

| Feature | NFS / SMB | S3 |
|---|---|---|
| Filesystem semantics | ✅ | ❌ (object) |
| POSIX compatibility | ✅ | ❌ |
| Cost | Higher | **Cheapest** |
| Scale | Limited | Unlimited |
| Latency | Lower | Slightly higher |
| Concurrent access | Yes | Yes (eventual consistency on writes) |
| Use for | Apps that need filesystem | Most cloud-native apps |

> **Prefer S3 when you don't need filesystem semantics** — cheaper, more durable, more scalable.

**EFS performance modes:**

| Mode | Detail |
|---|---|
| **General Purpose** (default) | Lowest latency, up to 35K IOPS |
| **Max I/O** | Higher throughput, slightly higher latency |
| **Bursting throughput** | Throughput scales with size |
| **Provisioned throughput** | Fixed throughput regardless of size |
| **Elastic throughput** (newer) | Auto-scales |

**EFS storage classes:**

| Class | Detail |
|---|---|
| **Standard** | Active access |
| **Infrequent Access (IA)** | After 30 days of inactivity (cheaper, retrieval fee) |
| **Archive** (newer) | Long-term, lowest cost |
| Lifecycle automatic | Move based on access |

**Common patterns:**

| Pattern | Detail |
|---|---|
| Container shared volume | EFS mounted in ECS / EKS |
| Lambda shared filesystem | EFS for ML models, large dependencies |
| User home directories | NFS or SMB depending on org |
| Build artifact cache | EFS in CI |
| Windows file share | FSx for Windows |
| HPC parallel I/O | FSx for Lustre |

**Performance tuning (NFS):**

| Tip | Detail |
|---|---|
| Larger `rsize` / `wsize` | 1 MB block (default 1MB on EFS) |
| Async mount for non-critical | Faster, riskier |
| Enable `noatime` | Avoid meta-data churn |
| Multiple mount points | Parallelize for ETL |
| EFS Mount Helper | Best practices baked in |
| Avoid many small files | Object storage usually better |

**Security:**

| Layer | NFS | SMB |
|---|---|---|
| Encryption in transit | Kerberos + krb5p, or TLS | SMB3 encryption |
| At rest | OS / volume encryption | OS / volume encryption |
| Auth | Kerberos / IP / UID | NTLMv2 / Kerberos / user |
| ACLs | POSIX or NFSv4 ACLs | Windows NTFS ACLs |
| Cloud (EFS) | TLS in transit, KMS at rest | (n/a — FSx for SMB has equivalent) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `no_root_squash` | Remote root can do anything |
| Hard mount on flaky network | Apps hang forever |
| Mismatched UID/GID across hosts | Permission chaos |
| SMB1 / CIFS in production | WannaCry-class exploits |
| NFS over public network without Kerberos | Sniffable |
| Many tiny files on NFS | Latency hell — use S3 |
| EFS without performance mode planning | Slow at scale |
| Locking races | Use Redis/distributed lock instead |
| Dev mounts symbolic links | Edge cases differ |

**Decision matrix:**

| Need | Pick |
|---|---|
| Linux app needing filesystem | **NFS** (EFS in AWS) |
| Windows app needing filesystem | **SMB** (FSx for Windows) |
| HPC, parallel I/O | FSx for Lustre |
| General cloud storage | **S3 (object)** |
| Container shared mount | EFS (Linux) or FSx (Windows) |
| Multi-protocol | FSx for NetApp ONTAP |
| Backups | S3 + lifecycle policies |

**Cross-references:**

- TCP / IP fundamentals: [tcp_ip_*.md](../../devops/networking/tcp_ip_udp.md)
- AWS S3: [aws_s3_*.md](../../devops/cloud_aws/aws_s3_simple_storage_service_buckets_versioning_lifecycle_presigned_replication.md)
- AWS EBS (block, alternative): [aws_ebs_*.md](../../devops/cloud_aws/aws_ebs_elastic_block_store_volumes_gp3_io2_snapshots_encryption.md)
- File transfer protocols: [ftp_sftp_*.md](ftp_sftp_file_transfer.md)

**Rule of thumb:** **NFS for Linux** environments (EFS in AWS), **SMB for Windows** (FSx for Windows). In modern cloud architectures, **prefer object storage (S3)** when you don't need filesystem semantics — it's cheaper, more durable, more scalable. Use **managed services** (EFS, FSx) instead of self-hosted file servers. Disable **SMB1/CIFS** everywhere — it has known critical exploits.
