### Package Managers

**Debian/Ubuntu (apt):**
- `apt update` - refresh package index
- `apt upgrade` - upgrade installed packages
- `apt install pkg` - install
- `apt remove pkg` - remove (keep config)
- `apt purge pkg` - remove + config
- `apt search keyword` - search
- `apt list --installed` - list installed
- `dpkg -l | grep pkg` - check if installed

**RHEL/CentOS/Amazon Linux (yum/dnf):**
- `yum update` / `dnf update` - upgrade all
- `yum install pkg` - install
- `yum remove pkg` - remove
- `yum search keyword` - search
- `yum list installed` - list installed
- `rpm -qa | grep pkg` - check installed

**Alpine (apk) - common in Docker:**
- `apk update` - refresh index
- `apk add pkg` - install
- `apk add --no-cache pkg` - install without caching (Dockerfile best practice)
- `apk del pkg` - remove

**Key differences for Docker images:**
- Alpine: smallest base (~5MB), uses `apk`, musl libc (can cause compatibility issues)
- Debian slim: ~80MB, familiar `apt`, glibc
- Distroless: no package manager, no shell, smallest attack surface

**Rule of thumb:** Use `apt` on Debian/Ubuntu, `yum`/`dnf` on RHEL family, `apk --no-cache` in Alpine Dockerfiles. Always run `update` before `install` in Dockerfiles.
