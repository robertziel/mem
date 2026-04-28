### Linux File Permissions

**Permission triplet — `rwx` for owner / group / others:**

```
-rwxr-xr--   1 alice  devs   1234 Apr 15 10:00 file.sh
│└┬┘└┬┘└┬┘
│ │  │  └── others:  r--      (read only)
│ │  └───── group:   r-x      (read + execute)
│ └──────── owner:   rwx      (read + write + execute)
└────────── type:    -        (regular file)
```

**File-type characters (first column):**

| Char | Type |
|---|---|
| `-` | Regular file |
| `d` | Directory |
| `l` | Symlink |
| `c` | Character device |
| `b` | Block device |
| `p` | Named pipe (FIFO) |
| `s` | Socket |

**Numeric (octal) form:**

| Bit | Value |
|---|---|
| `r` | 4 |
| `w` | 2 |
| `x` | 1 |
| `-` | 0 |

| Octal | Symbolic | Means |
|---|---|---|
| `7` | `rwx` | All |
| `6` | `rw-` | Read + write |
| `5` | `r-x` | Read + execute |
| `4` | `r--` | Read only |
| `3` | `-wx` | Write + execute (rare) |
| `2` | `-w-` | Write only (rare) |
| `1` | `--x` | Execute only |
| `0` | `---` | None |

**Common permission patterns:**

| Pattern | Use |
|---|---|
| `0600` | Private file (SSH private key, secrets, `.env`) |
| `0644` | Shared readable file (default for files via `umask 022`) |
| `0700` | Private directory (`~/.ssh/`, `~/.gnupg/`) |
| `0750` | Group-readable directory |
| `0755` | World-readable directory + executable (default for dirs) |
| `0775` | Group-writable directory (rarely needed) |
| `0664` | Group-writable file (shared work area) |
| `0777` | World-writable — **almost always wrong** |
| `1777` | World-writable + sticky (`/tmp`) |

**`chmod` — change permissions:**

| Form | Example | Means |
|---|---|---|
| Octal | `chmod 755 file` | rwx for owner, r-x for group + others |
| Symbolic | `chmod u+x file` | Add execute for owner |
| Symbolic with class | `chmod ug+w file` | Add write for owner + group |
| Reset | `chmod a=r file` | All classes get read only |
| Recursive | `chmod -R 750 dir/` | Recurse |
| **`X`** (capital) | `chmod -R u+rwX,go+rX,go-w dir/` | Execute on **dirs only** + files already executable — perfect for "make tree readable" |

| Symbolic letters |
|---|
| `u` = user (owner) |
| `g` = group |
| `o` = others |
| `a` = all |
| `+` add / `-` remove / `=` set exactly |

**`chown` / `chgrp` — change ownership:**

| Command | Effect |
|---|---|
| `chown alice file` | Change owner |
| `chown alice:devs file` | Change owner + group |
| `chown :devs file` | Change group only |
| `chgrp devs file` | Same — group only |
| `chown -R alice:devs dir/` | Recursive |
| `chown --reference=other_file file` | Match another file's ownership |
| `chmod --reference=other_file file` | Same idea for permissions |

**Special bits — setuid / setgid / sticky:**

| Bit | Octal | Effect on file | Effect on directory |
|---|---|---|---|
| **setuid** | `4xxx` | Run as **file owner** (e.g. `/usr/bin/passwd`) | (no effect) |
| **setgid** | `2xxx` | Run as **file group** | New files inherit dir's group |
| **sticky** | `1xxx` | (legacy on files) | Only owner can delete (e.g. `/tmp`) |

| Symbol | Detail |
|---|---|
| `chmod u+s` | Set setuid |
| `chmod g+s` | Set setgid |
| `chmod +t` | Set sticky |
| Visible as | `s` instead of `x` (e.g. `-rwsr-xr-x`); `t` for sticky |

**Default permissions — `umask`:**

| Concept | Detail |
|---|---|
| `umask` is a mask **subtracted** from default | `0666` (files) or `0777` (dirs) — `umask` |
| Typical `umask 022` | Files default to 644, dirs to 755 |
| Stricter `umask 077` | Files 600, dirs 700 — only owner |
| Per-user / per-process | Set in `~/.bashrc`, systemd `UMask=` |

**ACLs (POSIX ACLs — finer-grained than rwx):**

| Command | Use |
|---|---|
| `getfacl file` | Show ACLs |
| `setfacl -m u:bob:rw file` | Add Bob R/W |
| `setfacl -m g:devs:rx dir/` | Grant group |
| `setfacl -d -m u:bob:rw dir/` | Default ACL on new files |
| `setfacl -x u:bob file` | Remove |
| `setfacl -b file` | Strip all ACLs |
| Visible | `+` at end of `ls -l` permission column |

> ACLs are useful for "this third user / group needs access without joining the main group" — but add complexity. Standard rwx + groups is preferred.

**Capabilities — fine-grained "root"-like permissions on binaries:**

| Concept | Detail |
|---|---|
| Replace setuid root | Specific privileges only |
| `getcap /usr/bin/ping` | View |
| `setcap cap_net_raw+ep /usr/local/bin/myapp` | Allow raw sockets |
| `cap_net_bind_service` | Bind to ports < 1024 |
| `cap_dac_read_search` | Bypass file read perms |
| `cap_sys_admin` | Many kernel ops — never grant in apps |

**Symlink / hardlink permissions:**

| Concept | Detail |
|---|---|
| Symlink permissions | Almost always `0777` — ignored by kernel |
| What matters | Permissions of the **target** |
| Hardlink | Same file, different name; permissions are shared (it IS the file) |

**Directory `x` bit — what it means:**

| Bit | Effect on directory |
|---|---|
| `r` (read) | List contents (`ls`) |
| `w` (write) | Create / delete entries inside |
| `x` (execute) | **Traverse / cd into**; required to access contents |

> Without `x` on a directory, you can't `cd` or open files inside even if you have read on those files. Common gotcha.

**`ls -l` output decoded:**

```
-rwxr-xr-- 1 alice  devs   1234 Apr 15 10:00 file.sh
^         ^ ^      ^      ^    ^             ^
type+perms │ owner group  size mtime         name
           └ link count
```

| Column | Meaning |
|---|---|
| Type + permissions | First 10 chars |
| Link count | Hard links to this inode (dirs include `.` and `..`) |
| Owner | Username |
| Group | Group name |
| Size | Bytes |
| `mtime` | Modification time |
| Name | Filename (or `name -> target` for symlinks) |

**Time fields:**

| Time | Meaning |
|---|---|
| `mtime` | Last content modification |
| `atime` | Last access (often disabled with `noatime`) |
| `ctime` | Last metadata change (chmod / chown / link) |
| `birthtime` (modern FS) | Creation |
| Inspect with | `stat file` |

**SELinux / AppArmor — beyond DAC:**

| MAC system | Detail |
|---|---|
| **SELinux** | Type-based mandatory access control (RHEL family default) |
| **AppArmor** | Path-based MAC (Ubuntu / SUSE default) |
| Visible | `ls -Z file` (SELinux), AppArmor profile via `aa-status` |
| Effect | Even root can be denied if MAC policy says no |
| Common gotcha | App fails on SELinux-enforcing system; check `audit.log` / `ausearch` |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `chmod 777` "to fix permissions" | Massive security hole; rarely actually fixes anything |
| Setting `0644` on private keys | SSH refuses — must be `0600` |
| Forgetting `x` on directories | "Permission denied" even with `r` |
| Recursive `chmod 644` includes dirs | Can't `cd` after — use `find dir -type f -exec chmod 644 {} \;` for files only |
| Running as root to "make it work" | Hides the real issue |
| `setuid` on shell scripts | Ignored on most modern Unixes for security |
| ACLs without documentation | Surprise effective permissions |
| World-writable on `/tmp` without sticky | Anyone can delete others' files |

**Useful one-liners:**

| Goal | Command |
|---|---|
| Set permissions for files only | `find dir -type f -exec chmod 644 {} +` |
| Set permissions for directories only | `find dir -type d -exec chmod 755 {} +` |
| Find world-writable files | `find / -perm -o+w -type f 2>/dev/null` |
| Find setuid binaries (audit) | `find / -perm -4000 -type f 2>/dev/null` |
| Remove setuid from a file | `chmod u-s file` |
| Make tree readable but not over-execute | `chmod -R u+rwX,go+rX,go-w dir/` |
| Numeric permission view | `stat -c '%a %n' file` |

**Cross-references:**

- File descriptors / TCP / sockets: [file_descriptors_sockets_tcp_*.md](file_descriptors_sockets_tcp_fd_limits_ports.md)
- Process management + signals: [process_management.md](process_management.md)
- Shell scripting: [shell_scripting_bash_essentials.md](shell_scripting_bash_essentials.md)
- Container security (where these meet PSA): [container_security_*.md](../security/container_security_image_scanning_trivy_rootless_pss.md)

**Rule of thumb:** **secrets `0600`, executables / scripts `0755`, directories `0755`, SSH keys `0600` + `~/.ssh/` `0700`.** **Never `0777`** — the right answer is almost always more selective. Remember **directory `x` = traverse**, not just read. Use **groups** for shared access; ACLs only when groups don't fit.
