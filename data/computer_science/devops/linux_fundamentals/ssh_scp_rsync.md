### SSH, SCP, Rsync (Linux Remote Access + File Transfer)

**Three tools, related but distinct:**

| Tool | Use |
|---|---|
| **SSH** | Encrypted remote shell + tunneling |
| **SCP** | Simple file copy over SSH (legacy; SSH protocol implementation) |
| **SFTP** | Interactive file transfer over SSH |
| **rsync** | Smart file sync — only changed bytes, resumable |

> **Modern advice:** prefer **rsync over scp** for any non-trivial transfer. SCP has bugs and limitations that rsync avoids; some distros are deprecating the SCP protocol in favor of SFTP under the hood.

**SSH — connect:**

| Command | Use |
|---|---|
| `ssh user@host` | Connect with default port (22), default key |
| `ssh -p 2222 user@host` | Custom port |
| `ssh -i ~/.ssh/mykey user@host` | Specific identity file |
| `ssh -A user@host` | Forward authentication agent (use sparingly) |
| `ssh -X user@host` | Forward X11 (GUI apps) |
| `ssh user@host 'command'` | Run a single command and exit |
| `ssh -t user@host 'command'` | Force pseudo-tty (interactive cmd remotely) |
| `ssh -N -f -L 8080:localhost:3000 user@host` | Background local port-forward |
| `ssh -J jumphost user@target` | Jump (bastion) proxy |
| `ssh -o StrictHostKeyChecking=no user@host` | Skip host-key check (CI only — never prod) |
| `ssh -v` / `-vv` / `-vvv` | Verbose / very-verbose / debug |

**Port forwarding — three flavors:**

| Form | Direction | Example | Result |
|---|---|---|---|
| **Local** `-L` | Local → remote | `ssh -L 8080:localhost:3000 user@host` | Local `:8080` → remote `:3000` |
| **Remote** `-R` | Remote → local | `ssh -R 9090:localhost:3000 user@host` | Remote `:9090` → local `:3000` |
| **Dynamic** `-D` | SOCKS proxy | `ssh -D 1080 user@host` | All-direction tunnel via SOCKS5 on `:1080` |

**SSH config (`~/.ssh/config`) — best practice:**

```sshconfig
Host bastion
  HostName bastion.example.com
  User ubuntu
  IdentityFile ~/.ssh/work_ed25519

Host prod
  HostName 10.0.1.50
  User deploy
  IdentityFile ~/.ssh/work_ed25519
  ProxyJump bastion
  ServerAliveInterval 60
  ServerAliveCountMax 3
  Compression yes

Host *.internal
  User ec2-user
  IdentityFile ~/.ssh/aws_ed25519
  StrictHostKeyChecking accept-new
```

| Directive | Meaning |
|---|---|
| `Host` | Pattern (wildcards OK: `*.internal`, `dev-*`) |
| `HostName` | Real DNS / IP |
| `User` | Login user |
| `IdentityFile` | Private key path |
| `ProxyJump` | Bastion (replaces older `ProxyCommand`) |
| `ServerAliveInterval` / `ServerAliveCountMax` | Keepalive |
| `Compression yes` | Useful on slow links |
| `LocalForward` / `RemoteForward` / `DynamicForward` | Persistent tunnels |
| `StrictHostKeyChecking` | `yes` / `no` / `accept-new` |
| `IdentitiesOnly yes` | Don't try other keys |
| `ControlMaster auto` + `ControlPath` + `ControlPersist 10m` | Connection multiplexing — speeds up repeated SSH |

**Connection multiplexing (massive speed-up for repeated SSH):**

```sshconfig
Host *
  ControlMaster auto
  ControlPath ~/.ssh/cm-%r@%h:%p
  ControlPersist 10m
```

> First `ssh` opens a master connection; subsequent `ssh` / `scp` / `rsync` to the same host reuse it. Sub-second per command after the first.

**SSH key management:**

| Task | Command |
|---|---|
| Generate (recommended) | `ssh-keygen -t ed25519 -C "you@email"` |
| Generate RSA (legacy) | `ssh-keygen -t rsa -b 4096 -C "you@email"` |
| Generate FIDO/U2F-backed key | `ssh-keygen -t ed25519-sk -C "you@email"` |
| Install public key on remote | `ssh-copy-id user@host` |
| Start agent | `eval "$(ssh-agent -s)"` |
| Add key to agent | `ssh-add ~/.ssh/id_ed25519` |
| List loaded keys | `ssh-add -l` |
| Remove all keys from agent | `ssh-add -D` |
| Test agent forwarding | `ssh-add -L` from the remote |
| Generate certificate (with SSH CA) | `ssh-keygen -s ca_key -I id -n user host_pubkey.pub` |

**Permissions — must be exact:**

| Path | Permission |
|---|---|
| `~/.ssh/` | `700` |
| `~/.ssh/authorized_keys` | `600` |
| Private keys (`~/.ssh/id_*`) | `600` |
| Public keys (`*.pub`) | `644` |
| `~/.ssh/known_hosts` | `644` |
| `~/.ssh/config` | `600` |

> SSH refuses keys with too-loose permissions.

**Key types — modern recommendation:**

| Key | Use |
|---|---|
| **Ed25519** | **Default modern choice** — fast, small, secure |
| **Ed25519-sk** | Hardware-backed (YubiKey / FIDO2) — best |
| RSA 4096 | If you must support old servers (< OpenSSH 6.5) |
| RSA 2048 | Legacy minimum |
| DSA / ECDSA-P256 | Avoid for new keys |
| ssh-rsa with SHA-1 | Disabled in OpenSSH 8.8+ |

**Authorized keys options:**

```
# ~/.ssh/authorized_keys (per-key restrictions)
from="10.0.0.0/8",no-port-forwarding,no-agent-forwarding,command="/bin/backup-only" ssh-ed25519 AAAA... user@host
```

| Option | Effect |
|---|---|
| `from="<cidr>"` | Restrict source IP |
| `command="..."` | Force a specific command |
| `no-port-forwarding` | Disable tunneling for this key |
| `no-agent-forwarding` | Disable agent forwarding |
| `no-pty` | No interactive shell |
| `no-X11-forwarding` | Disable X11 |
| `expiry-time="20260101"` | OpenSSH 9.4+ |

**SCP — basic copy:**

| Direction | Command |
|---|---|
| Upload file | `scp file user@host:/path/` |
| Download file | `scp user@host:/path/file .` |
| Recursive | `scp -r dir/ user@host:/path/` |
| Custom port | `scp -P 2222 file user@host:/path/` |
| Use SSH config alias | `scp file prod:/path/` |
| Preserve times / mode | `scp -p file user@host:/path/` |

**Rsync — incremental, resumable, smart:**

| Pattern | Detail |
|---|---|
| Sync directory (with archive flag) | `rsync -avz src/ user@host:/dest/` |
| Mirror (delete extras at dest) | `rsync -avz --delete src/ dest/` |
| Dry run | `rsync -avzn ...` |
| Show progress | `rsync -avzP ...` (or `--progress`) |
| Resume partial transfer | `rsync -avz --partial --append-verify ...` |
| Exclude patterns | `rsync -avz --exclude='*.log' --exclude='node_modules/' ...` |
| Exclude file | `rsync -avz --exclude-from=.rsyncignore ...` |
| Preserve hardlinks / xattrs / ACLs | `rsync -aHAXv ...` |
| Bandwidth limit | `rsync -avz --bwlimit=1000` (KB/s) |
| Use SSH on custom port | `rsync -avz -e 'ssh -p 2222' src/ user@host:/dest/` |
| One-way mirror over rsync daemon | `rsync rsync://host/module/path` |

**Rsync flags decoded:**

| Flag | Means |
|---|---|
| `-a` (archive) | `-rlptgoD` — recursive + symlinks + perms + times + group + owner + devices |
| `-v` | Verbose |
| `-z` | Compression |
| `-h` | Human-readable sizes |
| `-P` | `--progress --partial` |
| `--delete` | Remove files at destination not in source |
| `--checksum` | Compare by checksum, not just mtime+size |
| `--dry-run` / `-n` | Preview |

**Trailing slash trap (most-confused rsync detail):**

| Source | Destination | Result |
|---|---|---|
| `rsync src dest` | — | Creates `dest/src/` (entire dir copied **into** dest) |
| `rsync src/ dest` | — | Copies **contents of `src/`** into `dest/` (no extra dir) |
| `rsync src/ dest/` | — | Same as above (trailing slash on dest is ignored) |

> **Trailing slash on source matters.** Forgetting it doubles the directory; remembering it copies contents.

**SFTP — interactive transfer:**

| Command | Use |
|---|---|
| `sftp user@host` | Open interactive session |
| `sftp -P 2222 user@host` | Custom port |
| `put file [remote]` | Upload |
| `get file [local]` | Download |
| `ls` / `lls` / `cd` / `lcd` | Navigate (`l` prefix = local) |
| `mkdir` / `rm` | File ops |
| `bye` | Exit |

**ssh-agent vs key-in-config:**

| Concern | Detail |
|---|---|
| Agent caches passphrase in memory | One unlock per session |
| Forward agent (`-A`) only to fully trusted hosts | Compromised remote can use your agent socket |
| Hardware-backed keys (YubiKey) | Strongest |
| `ssh-add -t 1h` | Key cached for 1 hour |
| 1Password / Bitwarden as agent | Modern UX with hardware-grade security |

**Server-side hardening (`/etc/ssh/sshd_config`):**

| Setting | Recommended |
|---|---|
| `PermitRootLogin` | `no` (or `prohibit-password` for cert-only) |
| `PasswordAuthentication` | `no` (key-only) |
| `KbdInteractiveAuthentication` | `no` |
| `PubkeyAuthentication` | `yes` |
| `AllowUsers` / `AllowGroups` | Whitelist |
| `MaxAuthTries` | 3 |
| `LoginGraceTime` | 30s |
| `ClientAliveInterval` / `ClientAliveCountMax` | Sensible keepalive |
| `Port` | Optional non-22 (security through obscurity, marginal) |
| `Protocol` | 2 (1 is long dead) |
| `Match Group` blocks | Per-group restrictions |
| `AuthorizedKeysCommand` | For dynamic key sources (LDAP, Vault) |

**Bastion / jump host pattern:**

| Goal | Detail |
|---|---|
| Internal hosts not exposed to internet | Single hardened bastion is the only public surface |
| `ProxyJump` (`-J`) replaces `ProxyCommand` | Modern, simple |
| MFA on bastion | TOTP / FIDO required |
| Audit logging on bastion | Every command logged |
| Short-lived SSH certificates from CA | Strong alternative to static keys |

**SSH certificates (better than `authorized_keys`):**

| Concept | Detail |
|---|---|
| SSH CA signs short-lived certs | Cert specifies user + host + validity |
| Server trusts the CA, not individual keys | One CA pubkey, many users |
| Revocation = let cert expire (or KRL list) | Easier than rotating thousands of `authorized_keys` |
| Tools | `step-ca`, HashiCorp Vault SSH CA, Teleport, Tailscale SSH |

**Connection / debugging:**

| Symptom | Action |
|---|---|
| "Permission denied (publickey)" | `ssh -v` to see which key was offered; check `authorized_keys` permissions |
| "Connection timed out" | Firewall / wrong port / host unreachable |
| "Connection refused" | sshd not running or wrong port |
| "Host key verification failed" | `ssh-keygen -R host` to remove old key, or accept new |
| Slow login | DNS reverse lookup; set `UseDNS no` on server |
| Disconnects after idle | Set `ServerAliveInterval` on client or `ClientAliveInterval` on server |

**Common security pitfalls:**

| Pitfall | Effect |
|---|---|
| `StrictHostKeyChecking no` in production | MitM target |
| Agent-forwarding to untrusted hosts | Server can use your agent for further auth |
| Long-lived static keys instead of certs | Hard to rotate; one leak = forever-trusted |
| `PermitRootLogin yes` | Audit black box; share-account |
| Password auth enabled | Brute-force surface |
| Key in `authorized_keys` without restrictions | Full shell access; restrict via `command="..."` |
| Forwarding ports without auth on the inner service | Tunnel exposes plaintext service |
| `ssh-add` of all keys at boot | Compromised laptop = unlimited reach |

**Use case → tool decision:**

| Need | Pick |
|---|---|
| Run a command on a remote box | `ssh` |
| Copy one file fast | `scp` (or `rsync` for safety) |
| Sync a directory tree | `rsync -avz` |
| Resume an interrupted transfer | `rsync --partial` |
| Mirror (with deletions) | `rsync --delete` |
| Browse + edit files interactively | `sftp` or VS Code Remote-SSH |
| Tunnel a single port | `ssh -L` / `ssh -R` |
| Tunnel arbitrary traffic | `ssh -D` SOCKS proxy |
| Long-running tunnel | `autossh` + systemd |

**Useful ecosystem tools:**

| Tool | Use |
|---|---|
| `mosh` | Resilient mobile shell over UDP |
| `tmux` / `screen` | Persistent sessions surviving disconnect |
| `autossh` | Auto-reconnect for tunnels |
| `parallel-ssh` / `pssh` | Run command on many hosts |
| `ansible` (via SSH) | Idempotent automation |
| Teleport / Tailscale SSH | Identity-aware SSH replacement |
| `sshfs` | Mount remote filesystem locally |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Ed25519 keys (or hardware-backed) | ✅ |
| `~/.ssh/config` for repeated hosts | ✅ |
| Agent-forwarding restricted to trusted hosts | ✅ |
| Bastion / jump host for internal access | ✅ |
| Server: password auth disabled, root login disabled | ✅ |
| `~/.ssh/` permissions correct (`700` / `600`) | ✅ |
| Connection multiplexing (`ControlMaster`) for repeated SSH | ✅ |
| `rsync -avz --dry-run` before destructive sync | ✅ |
| SSH certificates (or considered) for fleet at scale | ✅ |

**Rule of thumb:** **rsync over scp** for anything bigger than a single file. **ed25519 keys** (hardware-backed if you can). **`~/.ssh/config`** for every host you visit twice. **`ProxyJump` through a bastion** rather than exposing internal hosts. **Connection multiplexing** makes repeated SSH feel instant. Always **`rsync --dry-run`** before a `--delete` sync — once is enough to learn.
