### Linux Filesystem Hierarchy

**Key directories:**
- `/` - Root of the entire filesystem
- `/bin` - Essential user binaries (`ls`, `cp`, `cat`)
- `/sbin` - System binaries (`iptables`, `fdisk`, `reboot`)
- `/etc` - Configuration files (nginx.conf, fstab, hosts)
- `/var` - Variable data (logs in `/var/log`, spool, cache)
- `/tmp` - Temporary files, cleared on reboot
- `/home` - User home directories
- `/opt` - Optional/third-party software
- `/proc` - Virtual filesystem exposing kernel/process info
- `/dev` - Device files (block devices, tty)
- `/mnt`, `/media` - Mount points for filesystems

**Important files:**
- `/etc/passwd` - User accounts
- `/etc/shadow` - Hashed passwords
- `/etc/fstab` - Filesystem mount table
- `/etc/hosts` - Static hostname resolution
- `/etc/resolv.conf` - DNS resolver config
- `/var/log/syslog` or `/var/log/messages` - System logs

**Rule of thumb:** Config lives in `/etc`, logs live in `/var/log`, temp files in `/tmp`, user data in `/home`.
