### FTP / SFTP / SCP / rsync — File Transfer Protocols

**Definition:** four common file-transfer mechanisms. **FTP** is plaintext + insecure (never use). **FTPS** wraps FTP in TLS. **SFTP** is file transfer over SSH (the modern default). **SCP** is one-shot copy over SSH. **rsync** is incremental sync. In cloud environments, **prefer object storage (S3 / GCS)** over file transfer protocols.

**Side-by-side:**

| Protocol | Encryption | Port | Features | Best for |
|---|---|---|---|---|
| **FTP** | ❌ None | 21 + 20 | Full file mgmt | **Never** (insecure) |
| **FTPS** | ✅ TLS | 990 (implicit) / 21 (explicit) | Full file mgmt | Legacy compatibility |
| **SFTP** | ✅ SSH | 22 | Full file mgmt | **General secure transfer** |
| **SCP** | ✅ SSH | 22 | Copy only | Quick one-off copies |
| **rsync** | ✅ SSH (optional) | 22 (over SSH) | Incremental, compression | Backups, mirroring, large transfers |

**FTP — the legacy bad option:**

| Property | Detail |
|---|---|
| Plaintext credentials and data | Network sniff = full compromise |
| **Two connections** (control + data) | Firewall complexity |
| **Active mode** | Server connects back to client |
| **Passive mode** | Client initiates both connections (firewall-friendly) |
| Used because | Legacy systems, old vendor integrations |
| **Never use in production** | Use SFTP or FTPS |

**FTP active vs passive:**

| Mode | How | Firewall friendliness |
|---|---|---|
| **Active** | Server connects BACK to client port for data | ❌ Client needs open port |
| **Passive** | Client opens both connections | ✅ Recommended |

**SFTP — the modern default:**

| Property | Detail |
|---|---|
| File transfer over SSH | Built on SSH protocol |
| Encrypted (creds + data) | TLS-equivalent strength |
| **Single port** (22) | Simple firewall rules |
| **Not** "FTP over SSL" | Different protocol entirely |
| Supports: upload, download, listing, perms, resume | Full file mgmt |
| Port 22 (same as SSH) | One channel covers it |

**SFTP commands:**

```bash
# Interactive
sftp user@host

sftp> put local_file.txt /remote/path/      # upload
sftp> get /remote/file.txt ./local/         # download
sftp> ls /remote/path/                       # list
sftp> mkdir /remote/new_dir                  # create dir
sftp> rm /remote/old_file.txt                # delete
sftp> chmod 644 /remote/file.txt             # permissions
sftp> rename /old /new                        # rename
sftp> bye                                    # exit

# Non-interactive (batch)
sftp -b batch_file.txt user@host

# Recursive copy
sftp -r user@host:/remote/dir ./local/
```

**SFTP key-based auth (recommended):**

```bash
# Generate key pair (on client)
ssh-keygen -t ed25519 -C "sftp-key"

# Copy public key to server
ssh-copy-id user@host

# Now SFTP without password
sftp user@host
```

**SCP — quick copy (legacy but common):**

```bash
# Local → remote
scp local_file.txt user@host:/remote/path/

# Remote → local
scp user@host:/remote/file.txt ./local/

# Recursive
scp -r ./local_dir user@host:/remote/path/

# Specific port
scp -P 2222 file.txt user@host:/path/

# Preserve modes / times
scp -p file.txt user@host:/path/
```

| Property | Detail |
|---|---|
| One-shot copy | No interactive session |
| Built on SSH | Same auth |
| **Deprecated by OpenSSH** | OpenSSH 8.0+ recommends SFTP |
| Still works | But SFTP is preferred |
| Limitations | No directory listing, no resume |

**rsync — incremental sync (the workhorse):**

```bash
# Basic sync
rsync -av source/ user@host:dest/

# Common flags
rsync -avz \                  # archive mode + verbose + compress
      --delete \              # delete files in dest not in source
      --progress \            # show progress
      --partial \             # keep partial transfers (resume)
      --exclude='*.tmp' \     # exclude pattern
      source/ user@host:dest/

# Pull from remote
rsync -av user@host:remote/ local/

# Local-only sync
rsync -av source/ /backup/
```

**rsync flags decoded:**

| Flag | Effect |
|---|---|
| `-a` | Archive mode (preserves perms, times, symlinks, recursive) |
| `-v` | Verbose |
| `-z` | Compress during transfer |
| `-P` | Show progress + keep partial |
| `--delete` | Delete files in dest not in source (mirror mode) |
| `--exclude=PATTERN` | Skip matching files |
| `--include=PATTERN` | Force include despite excludes |
| `--dry-run` (`-n`) | Preview without changes |
| `--bwlimit=N` | Bandwidth limit (KB/s) |
| `-e ssh` | Use SSH transport (default in modern rsync) |

**rsync incremental magic:**

| Property | Detail |
|---|---|
| Compares source and dest | Checksums or size + mtime |
| Transfers only changed blocks | Massive savings on big files |
| Compression in flight | Saves bandwidth |
| Resumes interrupted transfers | `--partial` |
| Best for | Backups, mirroring, large datasets, dev → server sync |

**FTPS vs SFTP — common confusion:**

| Property | **FTPS** | **SFTP** |
|---|---|---|
| Underlying protocol | FTP wrapped in TLS | Built on SSH |
| Port | 990 / 21 | 22 |
| Connections | Two (control + data) | One |
| Firewall complexity | Higher | Lower |
| Modern adoption | Legacy | Strongly preferred |
| Vendor support | Some legacy systems require | Universal in modern Unix |

**File transfer cloud-native alternatives:**

| Tool | Detail |
|---|---|
| **AWS S3** | `aws s3 cp / sync` — most cloud-native |
| **GCS** | `gsutil cp / rsync` |
| **Azure Blob** | `azcopy sync` |
| **AWS Transfer Family** | Managed SFTP / FTPS endpoints (e.g., for partner integrations) |
| **AWS DataSync** | Bulk transfer between cloud / on-prem |
| **rclone** | Multi-cloud sync (S3, GCS, Azure, FTP, SFTP all in one tool) |

**Cloud-native equivalent commands:**

```bash
# AWS S3
aws s3 cp file.txt s3://bucket/path/
aws s3 sync ./local s3://bucket/dest/ --delete

# GCS
gsutil cp file.txt gs://bucket/
gsutil rsync -r ./local gs://bucket/dest/

# rclone (works with everything)
rclone sync ./local s3:bucket/dest/
rclone sync ./local sftp:host/path/
```

**Performance tuning:**

| Tool | Option |
|---|---|
| rsync | `--bwlimit`, `--compress`, `--partial` |
| scp | `-c aes128-ctr` (faster cipher), `-C` (compress) |
| SFTP | `-B 65536` (larger buffer) |
| AWS S3 | Multipart upload (auto), `--storage-class` |
| Parallel transfers | `pigz` for compression, `parallel` GNU tool |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Plain FTP in production | Credentials sniffable on network |
| Trailing slash confusion in rsync | `source/` vs `source` (different behaviors) |
| `--delete` without dry-run first | Data loss |
| Insufficient SSH server config | Limit max channels for SFTP |
| Permission mismatches (UID) | Files arrive with wrong owner |
| Hostkey trust (TOFU) | Spoofing risk if blindly trust |
| Symlink handling | rsync `-l` vs `-L` (preserve vs follow) |
| Network timeouts on huge files | Use `--partial` |
| Forgetting compression flag | Slower over WAN |

**Decision matrix:**

| Need | Pick |
|---|---|
| Interactive secure file management | **SFTP** |
| One-shot file copy | **SCP** (or SFTP) |
| Backup / sync large datasets | **rsync** over SSH |
| Mirror with deletions | rsync `--delete` |
| Cloud storage upload | **`aws s3 sync` / `gsutil rsync` / `rclone`** |
| Partner SFTP endpoint | AWS Transfer Family |
| Bulk migration | AWS DataSync, Snowball for huge |
| Legacy vendor integration | FTPS (if SFTP not supported) |
| Plain FTP | **Never** |

**Cross-references:**

- SSH / OpenSSH: [ssh_*.md](../../devops/linux_fundamentals/ssh_keypair_known_hosts_authorized_keys.md)
- TLS / HTTPS: [tls_*.md](../../web_security/tls_https_cipher_suites_certificate_validation.md)
- TCP / UDP fundamentals: [tcp_ip_*.md](../../devops/networking/tcp_ip_udp.md)
- AWS S3: [aws_s3_*.md](../../devops/cloud_aws/aws_s3_simple_storage_service_buckets_versioning_lifecycle_presigned_replication.md)

**Rule of thumb:** **SFTP for interactive secure transfer, rsync for sync / backup, SCP for quick copies, never plain FTP.** In cloud environments, prefer **object storage (S3 / GCS / Azure Blob)** with native CLI tools (`aws s3 sync`, `gsutil rsync`, `rclone`) — they're faster, more reliable, and integrate with IAM. Use **AWS Transfer Family** for partner-facing managed SFTP endpoints.
