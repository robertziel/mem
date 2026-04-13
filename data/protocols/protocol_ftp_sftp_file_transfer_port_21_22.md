### FTP & SFTP (File Transfer Protocols)

**FTP (File Transfer Protocol):**
- Transfer files between client and server
- Port 21 (control), Port 20 (data in active mode)
- Plaintext — credentials and data sent unencrypted
- **Never use FTP in production** (use SFTP or SCP instead)

**FTP modes:**
| Mode | How | Firewall |
|------|-----|----------|
| Active | Server connects BACK to client for data | Problematic (client needs open port) |
| Passive | Client initiates both connections | Firewall-friendly (recommended) |

**SFTP (SSH File Transfer Protocol):**
- File transfer over SSH (port 22)
- Encrypted (credentials + data)
- Not FTP over SSL — completely different protocol built on SSH
- Supports: upload, download, directory listing, permissions, resume

```bash
# SFTP commands
sftp user@host
sftp> put local_file.txt /remote/path/
sftp> get /remote/file.txt ./local/
sftp> ls /remote/path/
sftp> mkdir /remote/new_dir
sftp> rm /remote/old_file.txt
```

**FTPS (FTP over TLS):**
- FTP wrapped in TLS encryption
- Port 990 (implicit) or port 21 with STARTTLS (explicit)
- Still uses FTP protocol (two connections), just encrypted
- Less common than SFTP in modern setups

**FTP vs SFTP vs SCP vs rsync:**
| Protocol | Encryption | Features | Best for |
|----------|-----------|----------|----------|
| FTP | None | Full file management | Never (insecure) |
| FTPS | TLS | Full file management | Legacy compatibility |
| SFTP | SSH | Full file management | General secure transfer |
| SCP | SSH | Copy only (no listing) | Quick one-off copies |
| rsync | SSH (optional) | Incremental sync, compression | Backups, mirroring, large transfers |

**Rule of thumb:** SFTP for interactive file management. rsync for syncing/backup (incremental, faster for large datasets). SCP for quick one-off copies. Never use plain FTP. In cloud environments, prefer S3/object storage over file transfer protocols.
