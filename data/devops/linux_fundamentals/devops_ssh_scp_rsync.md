### SSH, SCP, Rsync

**SSH basics:**
- `ssh user@host` - connect
- `ssh -p 2222 user@host` - custom port
- `ssh -i ~/.ssh/mykey user@host` - specific key
- `ssh -L 8080:localhost:3000 user@host` - local port forward (access remote :3000 via local :8080)
- `ssh -R 9090:localhost:3000 user@host` - remote port forward
- `ssh -J jumphost user@target` - jump/bastion proxy
- `ssh -o StrictHostKeyChecking=no` - skip host key check (CI only, not production)

**SSH config (~/.ssh/config):**
```
Host prod
  HostName 10.0.1.50
  User deploy
  IdentityFile ~/.ssh/prod_key
  ProxyJump bastion

Host bastion
  HostName bastion.example.com
  User ubuntu
```
Then just: `ssh prod`

**SSH key management:**
- `ssh-keygen -t ed25519 -C "email"` - generate key (ed25519 preferred over RSA)
- `ssh-copy-id user@host` - install public key on remote
- `ssh-agent` + `ssh-add` - cache passphrase in memory
- Permissions: `~/.ssh/` = 700, private key = 600, public key = 644

**SCP (secure copy):**
- `scp file user@host:/path/` - upload
- `scp user@host:/path/file .` - download
- `scp -r dir/ user@host:/path/` - recursive

**Rsync (preferred over scp):**
- `rsync -avz src/ user@host:/dest/` - sync with compression
- `rsync -avz --delete src/ dest/` - mirror (delete extra files at dest)
- `rsync --dry-run` - preview changes
- `rsync --exclude='*.log'` - skip patterns
- `-a` = archive (preserves permissions, symlinks, timestamps)

**Rule of thumb:** Use rsync over scp for anything non-trivial. Use ed25519 keys. Use SSH config for repeated connections. Use jump hosts, never expose internal hosts directly.
