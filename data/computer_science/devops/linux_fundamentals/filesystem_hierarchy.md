### Linux Filesystem Hierarchy (FHS)

**Definition:** the **Filesystem Hierarchy Standard** defines the directory layout that virtually all Linux distros follow. Knowing where things live tells you where to look for config (`/etc`), logs (`/var/log`), binaries (`/usr/bin`), and runtime state (`/run`, `/proc`).

**Top-level directories:**

| Path | Purpose | Examples |
|---|---|---|
| **`/`** | Root of the entire filesystem | Everything below |
| **`/bin`** | Essential user binaries (often → `/usr/bin`) | `ls`, `cp`, `cat` |
| **`/sbin`** | System binaries (root-typical) | `iptables`, `fdisk`, `reboot` |
| **`/usr`** | User-installed software hierarchy | `/usr/bin`, `/usr/lib`, `/usr/share` |
| **`/usr/local`** | Locally-compiled software | Stuff `make install` puts there |
| **`/opt`** | Optional / third-party packages | `/opt/google/chrome` |
| **`/etc`** | System-wide configuration | `nginx.conf`, `fstab`, `hosts` |
| **`/home`** | User home directories | `/home/alice` |
| **`/root`** | Root user's home | Not under `/home` |
| **`/var`** | Variable / spool / state | `/var/log`, `/var/lib` |
| **`/tmp`** | Temporary files (cleared on reboot typically) | Application caches |
| **`/dev`** | Device files | `/dev/sda`, `/dev/null`, `/dev/tty` |
| **`/proc`** | Virtual FS — kernel + process info | `/proc/cpuinfo`, `/proc/<pid>/status` |
| **`/sys`** | Virtual FS — sysfs, hardware / drivers | `/sys/class/net/eth0/` |
| **`/run`** | Runtime data (since boot) | PID files, sockets |
| **`/mnt`** | Manual mount points | Mounted disks |
| **`/media`** | Removable media auto-mounts | USB drives, CDs |
| **`/boot`** | Boot loader + kernel | `vmlinuz`, `initrd.img` |
| **`/lib`** | Essential shared libs (often → `/usr/lib`) | Critical `.so` files |
| **`/srv`** | Service data (rarely used) | `/srv/www`, `/srv/ftp` |

**`/etc` — config quick reference:**

| File | Purpose |
|---|---|
| `/etc/passwd` | User accounts (login, UID, shell) |
| `/etc/shadow` | Hashed passwords (root-only readable) |
| `/etc/group` | Group memberships |
| `/etc/sudoers` | Sudo rules — edit with `visudo` |
| `/etc/fstab` | Mount table (filesystems at boot) |
| `/etc/hosts` | Static hostname → IP mappings |
| `/etc/resolv.conf` | DNS resolver config |
| `/etc/hostname` | This machine's hostname |
| `/etc/ssh/sshd_config` | SSH server config |
| `/etc/nginx/nginx.conf` | NGINX |
| `/etc/systemd/system/` | Systemd unit files |
| `/etc/cron.d/`, `/etc/crontab` | Cron jobs |
| `/etc/rc.local` (legacy) | Boot scripts (rare now) |
| `/etc/profile`, `/etc/bash.bashrc` | Shell setup |

**`/var` — runtime state:**

| Path | Purpose |
|---|---|
| `/var/log/` | All system + service logs |
| `/var/log/syslog` (Debian) / `/var/log/messages` (RHEL) | General system log |
| `/var/log/auth.log` (Debian) / `/var/log/secure` (RHEL) | Auth attempts |
| `/var/log/journal/` | systemd-journald binary logs (`journalctl`) |
| `/var/spool/` | Print, mail, cron queues |
| `/var/cache/` | Cached package data |
| `/var/lib/` | Service state (databases, dpkg, snap) |
| `/var/tmp/` | Temp files preserved across reboots |
| `/var/run/` (often → `/run`) | PID files, runtime sockets |

**`/proc` — virtual kernel filesystem:**

| Path | Detail |
|---|---|
| `/proc/cpuinfo` | CPU details |
| `/proc/meminfo` | Memory stats |
| `/proc/cmdline` | Kernel boot args |
| `/proc/version` | Kernel version |
| `/proc/loadavg` | Load average |
| `/proc/<pid>/` | Per-process info |
| `/proc/<pid>/cmdline` | Command line |
| `/proc/<pid>/status` | Process status |
| `/proc/<pid>/fd/` | Open file descriptors |
| `/proc/sys/` | Tunable kernel parameters |

**`/sys` — sysfs (hardware + drivers):**

| Path | Detail |
|---|---|
| `/sys/class/net/eth0/` | Network interface attributes |
| `/sys/block/sda/` | Block device info |
| `/sys/devices/` | Device tree |
| `/sys/kernel/` | Kernel parameters |

**`/dev` — device files:**

| Path | Detail |
|---|---|
| `/dev/null` | Discard everything written |
| `/dev/zero` | Infinite stream of zeros |
| `/dev/random`, `/dev/urandom` | Randomness sources |
| `/dev/sda`, `/dev/nvme0n1` | Block devices |
| `/dev/tty`, `/dev/pts/N` | Terminals |
| `/dev/loop0` | Loopback devices for mounting images |

**Bin location convention (modern):**

| Path | Detail |
|---|---|
| `/bin`, `/sbin`, `/lib`, `/lib64` | Often **symlinks** to `/usr/bin`, `/usr/sbin`, `/usr/lib`, `/usr/lib64` |
| Reason | UsrMerge — distros consolidated |
| Effect | Either path works in scripts; prefer `/usr/bin/` for portability |
| Distros that did this | Fedora, Debian (since 12), Arch, Ubuntu (since 24.04) |

**`PATH` and binary lookup order (typical):**

| Position | Path | Notes |
|---|---|---|
| 1 | `~/bin` (if set) | Per-user |
| 2 | `/usr/local/bin`, `/usr/local/sbin` | Locally compiled |
| 3 | `/usr/bin`, `/usr/sbin` | Distro packages |
| 4 | `/bin`, `/sbin` | Essential (often symlinks) |
| 5 | `/snap/bin`, `/opt/.../bin` | Optional |

**Where things actually live (modern):**

| Need | Path |
|---|---|
| System-wide config | `/etc/<service>/` |
| Per-user config | `~/.config/<app>/` (XDG) |
| Logs | `/var/log/<service>/` or `journalctl -u <service>` |
| Service state / DBs | `/var/lib/<service>/` |
| Sockets / PID files | `/run/<service>/` |
| User binaries | `~/.local/bin` or `/usr/local/bin` |
| Manual pages | `/usr/share/man/` |
| Locale / timezone data | `/usr/share/locale`, `/usr/share/zoneinfo` |
| systemd units | `/etc/systemd/system/`, `/lib/systemd/system/` |
| Snap packages | `/snap/`, `/var/snap/` |
| Containers (Docker) | `/var/lib/docker/` |

**Common interview / debug paths:**

| Question | Answer |
|---|---|
| "Where's `passwd`?" | `/usr/bin/passwd` |
| "Where do logs go?" | `/var/log/` (or `journalctl`) |
| "Where's the kernel?" | `/boot/vmlinuz-*` |
| "What mounts are active?" | `/etc/fstab` (config), `/proc/mounts` (live) |
| "What's running?" | `/proc/<pid>/` for each PID |
| "Network interfaces?" | `/sys/class/net/` |
| "Open files for a process?" | `/proc/<pid>/fd/` |
| "DNS resolution config?" | `/etc/resolv.conf`, `/etc/nsswitch.conf` |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Editing files in `/proc` or `/sys` directly | Volatile — reverts on reboot; use sysctl |
| Putting custom config in `/etc/<package>/<package>.conf` directly | Package upgrades may overwrite — use `<package>.d/` if available |
| `/tmp` cleared on reboot — storing important data there | Lose it |
| Editing `/etc/passwd` directly | Use `useradd` / `usermod` |
| Forgetting `/lib/systemd/system/` (vendor) vs `/etc/systemd/system/` (overrides) | Edit overrides only |
| Putting service state in `/etc/` | Wrong — config in `/etc`, state in `/var` |
| Polluting `/usr/local/bin` from `pip install` | Use venvs / `~/.local/bin` |

**Cross-references:**

- File permissions: [file_permissions_*.md](file_permissions_chmod_chown_setuid_acl.md)
- Process management: [process_management_*.md](process_management_signals_systemd_jobs.md)
- Package managers: [package_managers_*.md](package_managers_apt_yum_dnf_pacman.md)

**Rule of thumb:** **Config in `/etc`, logs in `/var/log`, runtime state in `/run` or `/var/lib`, temp in `/tmp`, user data in `/home`.** Binaries live under `/usr/bin` and `/usr/local/bin` (with `/bin` typically a symlink). Use `journalctl -u <service>` for systemd-managed logs; `/proc/<pid>/` for process introspection; never edit `/etc/passwd` or `/etc/shadow` by hand — use `useradd`, `passwd`, `usermod`.
