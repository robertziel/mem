### Dockerfile Best Practices

**Cross-ref:** for security-focused hardening (signing, scanning, runtime), see [container_security_image_scanning_*.md](../security/container_security_image_scanning_trivy_rootless_pss.md). This file is the **build / Dockerfile authoring** angle.

**Instruction reference (the ones you'll actually use):**

| Instruction | Purpose | Notes |
|---|---|---|
| `FROM` | Base image | Pin by digest or immutable tag |
| `ARG` | Build-time variable | Available only during build |
| `ENV` | Environment variable | Persists at runtime |
| `WORKDIR` | Set & create cwd | Always use; absolute path |
| `COPY` | Copy files in | **Prefer over `ADD`** |
| `ADD` | Like `COPY` + URL fetch + auto-extract tarballs | Avoid unless you specifically want extraction |
| `RUN` | Execute command, create new layer | Combine related work; clean caches in same `RUN` |
| `USER` | Switch user (UID:GID) | Set non-root |
| `EXPOSE` | Document port | Doesn't publish — runtime `-p` does |
| `LABEL` | Image metadata | OCI conventions: `org.opencontainers.image.*` |
| `HEALTHCHECK` | Image-level probe | See `docker_resource_limits_healthchecks.md` |
| `STOPSIGNAL` | Graceful-stop signal | `SIGTERM` default; `SIGINT`/`SIGQUIT` for some apps |
| `ONBUILD` | Run instruction in child image | Rare — confusing |
| `SHELL` | Override default shell | Rarely needed |
| `VOLUME` | Declare a mount point | Marks anonymous volume — beware unintended persistence |
| `ENTRYPOINT` | Fixed command | Pair with `CMD` for args |
| `CMD` | Default command | Overridable by `docker run image cmd...` |

**`ENTRYPOINT` vs `CMD` — pick by intent:**

| Form | Behavior |
|---|---|
| `CMD ["nginx"]` only | Default command; `docker run image other` replaces it |
| `ENTRYPOINT ["nginx"]` only | Always runs `nginx`; `docker run image -g daemon` becomes `nginx -g daemon` |
| `ENTRYPOINT ["python"]` + `CMD ["app.py"]` | `docker run image` → `python app.py`; `docker run image other.py` → `python other.py` |
| Shell form `CMD nginx -g …` | Runs through `/bin/sh -c`; PID 1 becomes shell — **signals lost** |
| Exec form `CMD ["nginx", "-g", "daemon off;"]` | App is PID 1 — receives SIGTERM correctly |

> **Always use exec form (`["..."]`)** for `CMD` and `ENTRYPOINT` so signals reach your process.

**Multi-stage build — the standard pattern:**

```dockerfile
# build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# runtime stage — only what's needed
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

| Property | Effect |
|---|---|
| Build tools never reach final image | Smaller, fewer CVEs |
| Source code stays in build stage | No accidental leak of `.git`, scratch files |
| Each `FROM` resets `WORKDIR`, `USER`, `ENV` | Re-set what you need |
| Multiple `--from=stage` | Pull artifacts from any prior stage |
| Stage names | `AS builder` for clarity |

**Layer caching — order by change frequency:**

| Order | Why |
|---|---|
| 1. Pin base image | Foundation |
| 2. System packages (`apt-get install`, etc.) | Change rarely |
| 3. Dependency manifests (`package*.json`, `requirements.txt`, `Gemfile*`, `go.mod` + `go.sum`) | Change less than source |
| 4. Install dependencies (`npm ci`, `pip install`, `bundle install`, `go mod download`) | Cached when manifest unchanged |
| 5. Application source code | Changes most often |
| 6. Build (`npm run build`, `go build`, `mvn package`) | Cached only when source unchanged |

> **Putting `COPY .` before `npm ci` busts the dependency cache on every source change.** Always copy manifests first, install, then copy source.

**Cache-friendly patterns:**

| Pattern | Effect |
|---|---|
| `COPY package*.json ./` then `RUN npm ci` then `COPY . .` | Deps cached across source edits |
| `RUN --mount=type=cache,target=/root/.npm npm ci` (BuildKit) | Cache survives across builds without baking into image |
| `RUN --mount=type=cache,target=/var/cache/apt apt-get install ...` | apt cache reused |
| `RUN --mount=type=secret,id=npm,target=/root/.npmrc npm ci` | Secrets injected without being baked into a layer |
| `RUN --mount=type=ssh ...` | Use host SSH agent for private repos |

**Image size — what bloats it:**

| Cause | Fix |
|---|---|
| Full distro base (`ubuntu:24.04`) | `-slim` / Alpine / **distroless** |
| Build tools in final image | Multi-stage |
| Cached package indexes | `rm -rf /var/lib/apt/lists/*` in same `RUN` |
| Unused dev deps | `npm ci --omit=dev`, `pip install --no-cache-dir` |
| Tests / docs / examples copied in | `.dockerignore` excludes them |
| Wide `COPY .` pulling junk | Specific `COPY` by directory |
| Multiple `RUN` layers | Combine with `&&` and `\` |
| Tarballs that aren't cleaned | Download + extract + remove in same layer |

**Combining `RUN` to reduce layers:**

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl tini \
 && rm -rf /var/lib/apt/lists/*
```

| Trick | Why |
|---|---|
| `--no-install-recommends` | Skip optional packages |
| Clean apt lists in same `RUN` | Otherwise added to layer + can't be removed in next layer |
| Combine related work | One layer per concern |

**`.dockerignore` — the underrated optimization:**

```
# What to exclude from build context
.git
.gitignore
node_modules
**/__pycache__
**/.pytest_cache
*.log
.env
.env.*
coverage/
build/
dist/
.idea/
.vscode/
README.md
docs/
tests/
.github/
```

| Effect | Detail |
|---|---|
| Smaller build context = faster `docker build` | Especially over remote daemons |
| Avoid leaking `.env` / secrets | Critical |
| Avoid invalidating cache from unrelated file changes | Less rebuild |

**User & permissions — never run as root:**

| Pattern | Detail |
|---|---|
| `USER node` (built-in for many official images) | Drop to non-root |
| `RUN useradd -u 1000 -m app` then `USER app` | Custom non-root |
| Numeric UID over name | Works with PSA `runAsNonRoot: true` |
| `--chown=user:user` on `COPY` | Right ownership without an extra `chown` layer |
| File permissions | Only group/owner write where needed |
| Don't `sudo` inside container | Defeats the purpose |

**Pinning images — three precision levels:**

| Form | Use |
|---|---|
| `FROM node:latest` | **Never in production** — non-deterministic |
| `FROM node:22-alpine` | Floats within a major; CI may break later |
| `FROM node:22.11.0-alpine` | Pinned semver (good baseline) |
| `FROM node@sha256:abc123...` | **Pinned by digest — fully reproducible** |
| Renovate / Dependabot to bump | Automate rotation |

**Secrets in builds — three ways:**

| Method | Detail |
|---|---|
| `ARG SECRET=... ` (build-time arg) | **Bakes into history** — visible via `docker history` |
| `ENV SECRET=...` | **Leaks to runtime + history** — never use |
| `RUN --mount=type=secret,id=name,target=/path` (BuildKit) | **Right way** — secret never lands in any layer |
| Multi-stage with secret in build only | Acceptable if final stage doesn't `COPY` it |

**`COPY` vs `ADD` — pick `COPY`:**

| Concern | `COPY` | `ADD` |
|---|---|---|
| Local files | ✅ | ✅ |
| Auto-extracts tarballs | ❌ | ⚠️ Surprising behavior |
| Fetches URLs | ❌ | ⚠️ No checksum, no auth, no caching |
| Predictability | ✅ | ❌ |
| Use `ADD` only when... | — | You explicitly want tar extraction |

**Build args vs env vars:**

| | `ARG` | `ENV` |
|---|---|---|
| Available during | Build | Build + runtime |
| In `docker history` | Yes (visible) | Yes (visible) |
| Use for | Compile flags, version strings | Runtime configuration |
| Secrets? | **No** | **No** |

**Multi-arch builds (BuildKit / `buildx`):**

| Tool | Use |
|---|---|
| `docker buildx build --platform linux/amd64,linux/arm64` | Build for multiple architectures |
| QEMU | Cross-architecture emulation |
| Native nodes for each arch | Faster than emulated |
| Manifest list | Single tag → multi-arch images |

**Rebuild & cache-busting strategy:**

| Need | Approach |
|---|---|
| Force fresh deps install | Bump `package-lock.json` or use `--no-cache` selectively |
| Get latest base image | `docker pull base:tag` then rebuild |
| Periodic CVE rebuild | Nightly `docker buildx build --pull` |
| Cache between CI runs | Registry cache: `--cache-from=type=registry,ref=...` + `--cache-to=...` |

**Health checks (high-level — see `docker_resource_limits_healthchecks.md`):**

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=10s \
  CMD ["/app/health"]
```

> Distroless images don't have `curl` — use a static binary entrypoint with a `health` subcommand.

**Init / signal handling (PID 1 problem):**

| Issue | Detail |
|---|---|
| PID 1 in containers must reap zombies | Some apps don't |
| `tini` / `dumb-init` | Tiny init that handles signals + reaping |
| `docker run --init` | Auto-add tini at runtime |
| `ENTRYPOINT ["tini", "--", "/app"]` | Build-time |
| Distroless `nonroot` images | Already use a small init |

**Build optimization checklist:**

| Check | Pass? |
|---|---|
| Multi-stage build | ✅ |
| Pinned base image (digest or `major.minor.patch`) | ✅ |
| `.dockerignore` excludes `.git`, `node_modules`, env files | ✅ |
| Manifest copied before source | ✅ |
| `RUN`s combined where related | ✅ |
| Dev deps + caches cleaned in final image | ✅ |
| Non-root `USER` | ✅ |
| Exec-form `CMD` / `ENTRYPOINT` | ✅ |
| `HEALTHCHECK` defined | ✅ |
| Labels for image metadata | ✅ |
| BuildKit secret mount for any build secrets | ✅ |
| No `latest` tag in production | ✅ |

**Common Dockerfile pitfalls:**

| Pitfall | Effect |
|---|---|
| `COPY . .` early | Cache busts on every source change |
| Shell-form `CMD nginx` | Signals don't reach app; ungraceful shutdown |
| `apt-get update` without `install` in same `RUN` | Stale package list cached |
| Running as root | Privilege escalation if exploited |
| Secrets in `ENV` or `ARG` | Visible in `docker history` |
| Missing `.dockerignore` | Slow builds; secret leak risk |
| `RUN apt-get install -y curl wget tini` then never cleaning | Bloated image |
| Tagged `latest` in prod | Non-deterministic; can't reproduce |
| Forgetting `WORKDIR` | Defaults to `/`, error-prone |
| `EXPOSE` confusion | It only documents — doesn't publish |
| Multiple processes in one container | "PID 1 problem"; supervisord is a smell |
| Copying `.git` | Reveals history; bloats image |
| `npm install` instead of `npm ci` | Different semantics — `ci` is reproducible |
| `pip install` without `--no-cache-dir` | Bloat |
| `ADD` for local files | Use `COPY` instead |

**Optimized Dockerfile patterns by language:**

| Language | Key tricks |
|---|---|
| Node | `npm ci`, multi-stage, `--omit=dev`, `node` user pre-defined |
| Python | `pip install --no-cache-dir -r requirements.txt`, multi-stage with wheel build, distroless final |
| Go | Static binary into `scratch` or distroless static; `CGO_ENABLED=0` |
| Java | `eclipse-temurin:21-jre` for runtime; layered jars; `-XX:+UseContainerSupport` |
| Rust | Multi-stage with cache mounts; `cargo chef` for dep caching |
| Ruby | `bundle config set --local without 'development test'`, multi-stage |

**Image labels (OCI convention):**

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.revision="<git-sha>"
LABEL org.opencontainers.image.version="1.2.3"
LABEL org.opencontainers.image.created="2024-04-15T10:00:00Z"
LABEL org.opencontainers.image.licenses="Apache-2.0"
```

**Tooling map:**

| Tool | Use |
|---|---|
| **hadolint** | Dockerfile linter |
| **dive** | Inspect image layers; spot bloat |
| **dockle** | Image security best-practices linter |
| **docker scout** | Built-in CVE scan + recommendations |
| **trivy** / **grype** | CVE scan |
| **buildx** | Multi-platform builds, advanced cache |
| **buildkit** | Default builder for modern Docker |
| **kaniko** | Build images inside K8s without daemon |

**Rule of thumb:** **multi-stage build, pinned base, copy manifests before source, combine `RUN`s, run as non-root, `.dockerignore` rigorously, exec-form `CMD`**. Use **distroless or slim** for runtime, **BuildKit cache + secret mounts** for fast and safe builds, **hadolint + scout/trivy** in CI. The goal: small, reproducible, signal-clean, scanned, signed.
