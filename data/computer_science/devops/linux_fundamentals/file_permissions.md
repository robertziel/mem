### Linux File Permissions

**Permission triplet:** `rwx` (read=4, write=2, execute=1) for owner, group, others.

```
-rwxr-xr-- 1 alice devs file.sh
 ^^^         owner
    ^^^      group
       ^^^   others
```

**chmod (change mode):**
- `chmod 755 file` - owner rwx, group r-x, others r-x
- `chmod 644 file` - owner rw-, group r--, others r--
- `chmod u+x file` - add execute for owner
- `chmod -R 750 dir/` - recursive

**chown (change owner):**
- `chown alice file` - change owner
- `chown alice:devs file` - change owner and group
- `chown -R alice:devs dir/` - recursive

**Special bits:**
- `setuid` (4xxx) - run as file owner (e.g., `/usr/bin/passwd`)
- `setgid` (2xxx) - run as group / new files inherit group
- `sticky bit` (1xxx) - only owner can delete in directory (e.g., `/tmp`)

**Common patterns:**
- `700` - private to owner (SSH keys directory)
- `600` - private file (SSH private key, secrets)
- `755` - shared executable/directory
- `644` - shared readable file

**Rule of thumb:** Secrets get 600, executables get 755, directories get 755, SSH keys get 600/700.
