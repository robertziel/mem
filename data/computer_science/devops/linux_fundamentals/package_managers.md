### Linux Package Managers

**By distro family:**

| Family | Package manager | Format | Lower-level tool |
|---|---|---|---|
| Debian / Ubuntu | **apt** | `.deb` | `dpkg` |
| RHEL / CentOS / Rocky / AlmaLinux / Amazon Linux 2023 / Fedora | **dnf** (`yum` legacy) | `.rpm` | `rpm` |
| Alpine | **apk** | `.apk` | — |
| Arch / Manjaro | **pacman** | `.pkg.tar.zst` | — |
| openSUSE | **zypper** | `.rpm` | `rpm` |
| Gentoo | **portage** (`emerge`) | source-built | — |
| FreeBSD | **pkg** | binary or ports | — |
| macOS | **Homebrew** (`brew`) | tarballs / casks | — |
| **Universal sandboxed** | Flatpak, Snap, AppImage | sandboxed apps | — |

**Debian / Ubuntu (apt + dpkg):**

| Goal | Command |
|---|---|
| Refresh index | `apt update` |
| Upgrade installed | `apt upgrade` (or `apt full-upgrade`) |
| Install | `apt install pkg` |
| Install local `.deb` | `apt install ./pkg.deb` (or `dpkg -i ./pkg.deb && apt -f install`) |
| Remove (keep config) | `apt remove pkg` |
| Remove + config | `apt purge pkg` |
| Cleanup unused deps | `apt autoremove` |
| Search | `apt search keyword` |
| List installed | `apt list --installed` (or `dpkg -l`) |
| Check if installed | `dpkg -l \| grep pkg` |
| Show details | `apt show pkg` (or `dpkg -s pkg`) |
| Files in a package | `dpkg -L pkg` |
| Which package owns a file | `dpkg -S /path/to/file` |
| Hold version | `apt-mark hold pkg` |
| Sources | `/etc/apt/sources.list` + `/etc/apt/sources.list.d/*` |

**RHEL / Fedora (dnf, was yum):**

| Goal | Command |
|---|---|
| Update all | `dnf update` (or `yum update` on older) |
| Install | `dnf install pkg` |
| Install local `.rpm` | `dnf install ./pkg.rpm` (or `rpm -i ./pkg.rpm`) |
| Remove | `dnf remove pkg` |
| Search | `dnf search keyword` |
| List installed | `dnf list installed` |
| Check installed | `rpm -qa \| grep pkg` |
| Show details | `dnf info pkg` |
| Files in package | `rpm -ql pkg` |
| Owner of file | `rpm -qf /path/to/file` |
| History (rollback) | `dnf history` / `dnf history undo <id>` |
| Sources | `/etc/yum.repos.d/*.repo` |
| GPG keys | `rpm --import` |

**Alpine (apk) — common in Docker:**

| Goal | Command |
|---|---|
| Refresh index | `apk update` |
| Install | `apk add pkg` |
| Install without caching (Dockerfile) | `apk add --no-cache pkg` |
| Install build deps temporarily | `apk add --virtual .build-deps gcc musl-dev && ... && apk del .build-deps` |
| Remove | `apk del pkg` |
| Search | `apk search keyword` |
| List installed | `apk info` |
| Files in package | `apk info -L pkg` |
| Owner of file | `apk info --who-owns /path` |
| Sources | `/etc/apk/repositories` |

**Arch (pacman):**

| Goal | Command |
|---|---|
| Sync + upgrade | `pacman -Syu` |
| Install | `pacman -S pkg` |
| Remove | `pacman -R pkg` (or `-Rs` to remove orphan deps) |
| Search | `pacman -Ss keyword` |
| List installed | `pacman -Q` |
| Files in package | `pacman -Ql pkg` |
| Owner of file | `pacman -Qo /path` |

**Sandboxed / cross-distro:**

| Tool | Detail |
|---|---|
| **Flatpak** | Sandboxed apps; common on Fedora / desktop Linux; `flatpak install flathub <ref>` |
| **Snap** | Canonical's; `snap install pkg` |
| **AppImage** | Portable single-file apps; just download + chmod +x |
| **Homebrew on Linux** (`brew`) | Same as macOS Brew; userspace, no sudo |
| **Nix / nixpkgs** | Reproducible, declarative; `nix-env -iA nixpkgs.pkg` |

**Language-specific package managers (worth knowing):**

| Language | Tool |
|---|---|
| Node | npm / pnpm / yarn / bun |
| Python | pip + venv / Poetry / uv / pipx |
| Ruby | gem + Bundler |
| Java | Maven / Gradle |
| Rust | cargo |
| Go | `go install` (modules) |
| .NET | NuGet |
| PHP | Composer |
| Elixir | mix |
| Haskell | cabal / stack |

**Comparing package managers — Docker base sizes:**

| Base | Size | Manager |
|---|---|---|
| Distroless | 2–20 MB | None |
| Alpine | ~5 MB | `apk` |
| Debian slim | ~80 MB | `apt` |
| Ubuntu | ~70 MB | `apt` |
| Fedora minimal | ~150 MB | `dnf` |
| Full Ubuntu / Debian | 250+ MB | `apt` |

**Docker best practices for package management:**

```dockerfile
# Debian / Ubuntu
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl tini \
 && rm -rf /var/lib/apt/lists/*

# Alpine
RUN apk add --no-cache ca-certificates curl tini

# Multi-stage build deps that go away
RUN apk add --virtual .build-deps gcc musl-dev \
 && pip install --no-cache-dir -r requirements.txt \
 && apk del .build-deps
```

| Rule | Why |
|---|---|
| `apt-get update` + `install` in **same** `RUN` | Avoid stale apt cache |
| `--no-install-recommends` | Skip optional packages |
| `rm -rf /var/lib/apt/lists/*` in same `RUN` | Don't bake apt cache into layer |
| `apk add --no-cache` | One-step install + no cache layer |
| `--virtual .build-deps` then `apk del` | Clean removal of compile-time deps |
| `--no-cache-dir` for `pip` | Smaller layer |

**Repositories & signing:**

| Concern | Detail |
|---|---|
| **GPG-signed metadata** | apt's Release files, RPM `repomd.xml.asc` |
| Verify signature | apt does it automatically; `dnf --verify` |
| Add a third-party repo | `/etc/apt/sources.list.d/x.list` + matching `/etc/apt/keyrings/x.gpg` |
| Modern apt | Per-source signed-by keys, deb822 format |
| Pinning | Avoid surprise upgrades; `/etc/apt/preferences.d/` |

**Security — keep current:**

| Concern | Detail |
|---|---|
| Subscribe to security advisories | per-distro mailing list |
| `unattended-upgrades` (Debian/Ubuntu) | Auto-install security updates |
| `dnf-automatic` (Fedora/RHEL) | Same idea |
| Container scanning | Trivy / Grype to detect vulnerable installed packages |
| Distroless / minimal base | Smaller attack surface |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `apt-get update` cached forever in Docker | Stale; install fails after upstream changes |
| `apt-get install -y` without `--no-install-recommends` | Bloated images |
| Forgetting to clean apt cache in same layer | Layer baked with cache |
| Mixing system packages with language packages (npm globally as root) | Permission issues |
| `npm install` instead of `npm ci` | Non-deterministic |
| Pinning system packages forever | Misses security updates |
| Using `latest` for OS packages in CI | Builds break unpredictably |
| Hand-editing `/etc/apt/sources.list` and forgetting key | apt won't trust the source |

**Cross-references:**

- Dockerfile best practices: [dockerfile_best_practices.md](../docker/dockerfile_best_practices.md)
- Container security: [container_security_*.md](../security/container_security_image_scanning_trivy_rootless_pss.md)
- CI pipeline + caching: [artifact_management_caching_*.md](../ci_cd/artifact_management_caching_docker_registry_versioning.md)

**Rule of thumb:** **`apt`** on Debian/Ubuntu, **`dnf`** on RHEL family, **`apk --no-cache`** in Alpine Dockerfiles. **Always run `update` before `install`** in Dockerfiles, in the **same `RUN`** layer, and **clean caches in the same layer**. For minimal attack surface in production, **distroless or `-slim`** beats full distros. Subscribe to your distro's **security advisories** and automate patching for non-disruptive updates.
