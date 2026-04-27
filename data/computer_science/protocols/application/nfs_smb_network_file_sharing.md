### NFS & SMB (Network File Sharing)

**NFS (Network File System):**
- Unix/Linux standard for sharing filesystems over a network
- Mounts remote directory as if it were local
- Port 2049 (NFSv4)
- Stateless (NFSv3), stateful (NFSv4)

```bash
# Server: export a directory
echo "/shared 10.0.1.0/24(rw,sync,no_subtree_check)" >> /etc/exports
exportfs -ra

# Client: mount the share
mount -t nfs server:/shared /mnt/shared
# Or persistent in /etc/fstab:
server:/shared /mnt/shared nfs defaults 0 0
```

**NFS versions:**
| Version | Features |
|---------|---------|
| NFSv3 | Stateless, widely supported, UDP or TCP |
| NFSv4 | Stateful, built-in security (Kerberos), TCP only, firewall-friendly (single port) |
| NFSv4.1 | Parallel NFS (pNFS), session trunking |

**AWS EFS = Managed NFS:**
- Fully managed NFSv4.1 filesystem
- Multi-AZ, auto-scaling
- Mount from EC2, ECS, EKS, Lambda

**SMB/CIFS (Server Message Block):**
- Windows standard for file/printer sharing
- Also known as CIFS (Common Internet File System, older name)
- Port 445 (SMB over TCP), Port 139 (legacy NetBIOS)
- Used by: Windows file shares, Active Directory, Samba (Linux)

```bash
# Linux client: mount Windows/Samba share
mount -t cifs //server/share /mnt/share -o username=user,password=pass

# Or using smbclient
smbclient //server/share -U user
```

**NFS vs SMB:**
| Feature | NFS | SMB |
|---------|-----|-----|
| Platform | Unix/Linux native | Windows native |
| Performance | Generally faster on Linux | Better on Windows |
| Security | Kerberos (NFSv4), IP-based (NFSv3) | NTLM, Kerberos, user-based |
| Use case | Linux servers, containers, HPC | Windows environments, Active Directory |
| Cloud managed | AWS EFS, GCP Filestore | AWS FSx for Windows |
| Port | 2049 | 445 |

**AWS FSx options:**
| Service | Protocol | Use case |
|---------|----------|----------|
| EFS | NFS | Linux workloads, containers |
| FSx for Windows | SMB | Windows apps, Active Directory |
| FSx for Lustre | Lustre | HPC, ML training (high throughput) |
| FSx for NetApp ONTAP | NFS + SMB | Multi-protocol, enterprise |

**Rule of thumb:** NFS for Linux environments (EFS in AWS). SMB for Windows environments (FSx for Windows in AWS). In modern cloud architectures, prefer object storage (S3) over file sharing when possible. Use managed services (EFS, FSx) instead of self-hosted file servers.
