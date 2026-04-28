### Docker — Volumes & Networking

**Definition:** **volumes** persist data outside the container's writable layer (which is ephemeral); **networking** connects containers to each other and the world. Default behavior surprises: containers lose data on remove, and on the default bridge network they don't auto-DNS each other.

**Volume types:**

| Type | Syntax | Use case | Persistence |
|---|---|---|---|
| **Named volume** | `-v dbdata:/var/lib/postgresql/data` | Persistent data (DB, uploads) | Survives container removal |
| **Bind mount** | `-v /host/path:/container/path` | Dev: live code reload | Tied to host path |
| **tmpfs** | `--tmpfs /tmp` | Sensitive data, no persistence | Memory only |
| **Anonymous volume** | `-v /var/lib/postgresql/data` | Temporary, auto-named | Survives but hard to reuse |

**Side-by-side:**

| Property | Named volume | Bind mount | tmpfs |
|---|---|---|---|
| Managed by Docker | ✅ | ❌ | ✅ |
| Portable across machines | ✅ | ❌ (host-specific) | N/A (memory) |
| Survives container removal | ✅ | Depends on host | ❌ |
| Best for production data | ✅ | ❌ | Sensitive data only |
| Best for dev (live code) | ❌ | ✅ | ❌ |
| Permissions surprises | Less | Common (UID mismatch) | None |

**Volume commands:**

```bash
docker volume create mydata
docker volume ls
docker volume inspect mydata
docker volume rm mydata
docker volume prune                # remove unused volumes
docker run -v mydata:/data myimage
docker run --mount source=mydata,target=/data myimage  # newer syntax
```

**Compose volumes:**

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - dbdata:/var/lib/postgresql/data       # named volume
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro   # bind mount, read-only

volumes:
  dbdata:
```

**Networking modes:**

| Mode | Description | Use case |
|---|---|---|
| **bridge** (default) | Isolated bridge network on host | Container-to-container same host |
| **host** | Share host's network namespace | Performance, no port mapping |
| **overlay** | Multi-host network | Docker Swarm / multi-node |
| **macvlan** | Container gets MAC + IP on physical network | Legacy apps, special routing |
| **none** | No networking | Security isolation |
| **container:other** | Share another container's network | Sidecar pattern |

**Default bridge vs custom bridge — DNS matters:**

| Property | Default bridge | Custom user bridge |
|---|---|---|
| DNS resolution by container name | ❌ (must use `--link` legacy) | ✅ Auto |
| Isolated from default | No | Yes |
| Best for | Almost never | **Almost always** |

> **Always use a custom user-defined bridge network.** Containers automatically resolve each other by name.

**Network commands:**

```bash
docker network create mynet
docker network ls
docker network inspect mynet
docker network connect mynet container
docker network disconnect mynet container
docker run --network mynet --name web nginx       # name resolves on the net
docker run --network mynet curlimages/curl http://web   # ↑ this works
```

**Compose networking — automatic:**

```yaml
services:
  web:
    image: nginx
  db:
    image: postgres:16
# Compose creates a default network for the project.
# `web` can connect to `db` via the hostname `db`.
```

| Property | Detail |
|---|---|
| Default network per project | `<project>_default` |
| Service name = DNS name | `db`, `web`, `api` |
| Aliases supported | Custom DNS names |
| Define multiple networks | For isolation |
| External networks | Connect to existing |

**Port publishing — `-p` syntax:**

| Form | Effect |
|---|---|
| `-p 8080:80` | Map host:container |
| `-p 127.0.0.1:8080:80` | Bind to specific host IP |
| `-p 8080:80/udp` | UDP |
| `-P` | Auto-publish all EXPOSE'd ports to random host ports |
| No `-p` | Container port not reachable from host |

> **Inside the same Docker network, no port publishing needed** — containers reach each other on the container port directly.

**Health checks in Compose:**

```yaml
services:
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  web:
    depends_on:
      db:
        condition: service_healthy   # wait for db to be ready
```

| Property | Detail |
|---|---|
| `interval` | How often |
| `timeout` | Per-check |
| `retries` | Before unhealthy |
| `start_period` | Grace at startup |
| `service_healthy` dependency | Wait for green |

**Docker daemon / iptables / firewall surprises:**

| Issue | Detail |
|---|---|
| Docker manages iptables by default | Can override host firewall rules |
| Published ports bypass UFW | UFW rules don't apply to Docker by default |
| Use `--iptables=false` | If you want manual control (rare) |
| Public Docker host | Specific firewall config needed |
| Bind to localhost | `127.0.0.1:8080:80` to limit exposure |

**Storage drivers — how layers stack:**

| Driver | Detail |
|---|---|
| **overlay2** | Default modern; copy-on-write |
| `aufs` | Legacy, removed in newer Docker |
| `devicemapper` | RHEL legacy |
| `btrfs` / `zfs` | Specialized |
| Storage class for volumes | Can be ephemeral or persistent |

**Multi-stage Dockerfile — separate concerns:**

```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

| Win | Detail |
|---|---|
| Final image only contains runtime | Smaller |
| Build tools not shipped | Smaller attack surface |
| Each stage cacheable | Faster CI |
| Multi-arch builds via Buildx | Easy |

**Common patterns:**

| Pattern | Use |
|---|---|
| Sidecar (logger, proxy) | Two containers, shared network |
| Init container | Data setup before main container |
| Build cache mount | Persist npm/pip cache across builds |
| Read-only filesystem | `--read-only` for security |
| User namespace remapping | Container root ≠ host root |
| Docker Compose profiles | Toggle dev vs prod services |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Default bridge network | DNS doesn't resolve container names |
| Storing data in container layer | Lost on remove |
| Bind mount UID mismatch | Permission denied (host UID 1000 vs container's) |
| `latest` tag in production | Can't pin / rollback |
| Privileged container | Security risk |
| No health check | Compose waits arbitrarily |
| Volumes filling disk | No quotas → host disk fills |
| Forgotten anonymous volumes | Disk waste |
| Port published to all interfaces | Inadvertent public exposure |
| Building large images (Ubuntu base, dev deps) | Slow CI, slow deploys |

**Best practices checklist:**

| Practice | Detail |
|---|---|
| Custom bridge network for related services | Auto-DNS |
| Named volumes for persistent data | Survives removal |
| Bind mounts for dev / config | Live editing |
| Health checks on every service | Compose ordering |
| Multi-stage builds | Smaller production images |
| Pin image tags | `node:20.11.0-slim` not `node:latest` |
| `USER` directive (not root) | Security |
| `.dockerignore` | Exclude build artifacts |
| `--read-only` filesystem | Security hardening |
| Resource limits | `--memory`, `--cpus` |
| Vulnerability scan in CI | Trivy / Snyk |

**Cross-references:**

- Container security: [container_security_*.md](../../web_security/container_security_image_runtime_kubernetes.md)
- Kubernetes (Docker's runtime in production): [k8s_*.md](../../kubernetes/architecture_overview.md)
- Immutable infrastructure: [immutable_*.md](../infrastructure_as_code/immutable_vs_mutable_infra.md)
- CI/CD pipelines: [cicd_pipeline_*.md](../ci_cd/cicd_pipeline_design.md)

**Rule of thumb:** **Use named volumes for persistent data, bind mounts for dev (live code reload).** Always use a **custom user-defined bridge network** so containers can resolve each other by name. **Multi-stage builds** for smaller production images. **Health checks** + `service_healthy` dependencies for proper ordering. Pin image tags — never use `latest` in production.
