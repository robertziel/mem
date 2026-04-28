### Container & Image Security (Trivy, Rootless, PSS, Cosign)

**Layered defense — the surface a container exposes:**

| Layer | Risk | Defense |
|---|---|---|
| **Base image** | OS CVEs (libc, openssl, libcurl) | Minimal / pinned / regularly rebuilt |
| **App dependencies** | Known CVEs in libs | SCA scanning, lockfile pinning |
| **Image build** | Secrets baked in, oversized images | Multi-stage build, `.dockerignore` |
| **Image registry** | Untrusted images deployed | Signing + admission verification |
| **Runtime** | Privilege escalation, breakout | Non-root, drop caps, read-only FS, seccomp |
| **Network** | Lateral movement | NetworkPolicy default-deny + service mesh mTLS |
| **Host kernel** | Container escape | Up-to-date kernel, gVisor / Kata for high-risk |
| **Workload behavior** | Active exploit | Falco / Tetragon runtime detection |

**Base image options — smaller is safer:**

| Base | Size | Attack surface | Use when |
|---|---|---|---|
| Full distro (`ubuntu`, `debian`) | ~70–250 MB | Largest | Need extensive tooling at runtime |
| `*-slim` | ~30–80 MB | Medium | Modern default for most apps |
| Alpine (`*:alpine`) | ~5–30 MB | Small (musl libc differs) | Static binaries, Go, simple Python/Node |
| **Distroless** (`gcr.io/distroless/*`) | ~2–20 MB | Minimal — no shell, no package manager | **Production default** for compiled apps |
| `scratch` | 0 bytes | Minimal — only your binary | Static Go / Rust |
| Chainguard / Wolfi images | Small | Minimal + signed + SBOM | Modern hardened alternative |

> **No shell = no shell attack.** Distroless is the simple win for any app that doesn't need to exec at runtime.

**Image build — Dockerfile hardening checklist:**

| Item | Why |
|---|---|
| Pin base image **by digest** (`@sha256:…`) | Reproducible; tag floats, digest doesn't |
| Multi-stage build | Build tools / source / SDKs stay out of final image |
| `.dockerignore` excludes `.git`, `node_modules`, env files | Less leak risk, smaller context |
| `USER nonroot` (or numeric UID like `1000`) | Container runs as non-root by default |
| `COPY` specific files; not `COPY .` | Don't pull in junk |
| `--chown` on `COPY` if user differs | Right ownership without an extra layer |
| `HEALTHCHECK` defined | Visible health to orchestrator |
| Cache mounts (`RUN --mount=type=cache,...`) | Faster CI builds |
| Secret mounts (`RUN --mount=type=secret,...`) | Secrets never end up in layers |
| `LABEL org.opencontainers.image.*` | Metadata for tooling |
| One concern per image | "Sidecars" or `init` containers, not bash combos |
| No `apt update` without `apt install ... --no-install-recommends` | Smaller, fewer CVEs |
| Clean caches in same `RUN` | `rm -rf /var/lib/apt/lists/*` |

**Multi-stage example (skeleton):**

```dockerfile
# build stage
FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app ./cmd/server

# runtime stage — distroless, no shell
FROM gcr.io/distroless/static-debian12:nonroot
USER nonroot:nonroot
COPY --from=build /out/app /app
EXPOSE 8080
ENTRYPOINT ["/app"]
```

**Image scanning — what to scan + when:**

| Stage | Tool | Block on |
|---|---|---|
| Pre-commit (Dockerfile lint) | hadolint | Style + obvious issues |
| Pre-build (deps lockfile) | SCA (Snyk, Dependabot, Trivy fs) | Critical / High in dependencies |
| Build (config / IaC) | Trivy config, Checkov | Misconfigurations |
| Post-build (image) | Trivy image, Grype, Snyk Container, Docker Scout | OS + lib CVEs at Critical / High |
| Pre-push (signing) | cosign | Image signed by trusted key |
| In registry | ECR / GCR / Harbor scanning | Continuous re-scan as new CVEs land |
| Pre-admission (cluster) | Kyverno / Sigstore policy-controller | Signature + scan results pass |
| Runtime | Falco, Tetragon, Sysdig | Active threat detection |

**Trivy quickref:**

```bash
trivy image myapp:1.2.0                      # CVEs in image
trivy image --severity CRITICAL,HIGH --exit-code 1 myapp:1.2.0
trivy fs .                                    # filesystem / project
trivy config terraform/                       # IaC misconfigurations
trivy sbom myapp.spdx.json                    # parse SBOM
trivy image --format spdx-json -o sbom.json myapp:1.2.0   # generate SBOM
trivy image --ignorefile .trivyignore myapp:1.2.0         # known accepted CVEs
```

**Image signing & verification — Sigstore stack:**

| Tool | Role |
|---|---|
| **cosign** | Sign images, blobs, SBOMs |
| **Rekor** | Transparency log of signatures |
| **Fulcio** | Short-lived cert issuer (keyless signing) |
| **policy-controller** / **Kyverno** image verification | Verify signatures at admission time |

**Sign + verify (keyless OIDC, modern way):**

```bash
# Sign (uses OIDC identity — no key file)
cosign sign --identity-token <token> ghcr.io/org/app:1.2.0

# Verify
cosign verify \
  --certificate-identity-regexp '^https://github.com/org/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/org/app:1.2.0
```

**SBOM (Software Bill of Materials):**

| Format | Notes |
|---|---|
| **SPDX** | OSI standard, broad tooling support |
| **CycloneDX** | OWASP-led, security-focused |
| Generate | `syft myapp:1.2.0 -o spdx-json > sbom.json`, or `trivy image --format spdx-json` |
| Sign + attach | `cosign attest --predicate sbom.json --type spdxjson` |
| Use | Answer "are we using log4j 2.14.x anywhere?" instantly |

**Runtime hardening — `securityContext` checklist:**

| Field | Value | Why |
|---|---|---|
| `runAsNonRoot` | `true` | Refuse to run as UID 0 |
| `runAsUser` | `1000` (or higher) | Specific non-root UID |
| `runAsGroup` / `fsGroup` | `1000` | Group ownership for mounted volumes |
| `readOnlyRootFilesystem` | `true` | Force tmpfs / volumes for any writes |
| `allowPrivilegeEscalation` | `false` | Block setuid escalation |
| `privileged` | `false` (default) | **Never** true in app workloads |
| `capabilities.drop` | `["ALL"]` | Start from zero |
| `capabilities.add` | only what's needed (e.g., `NET_BIND_SERVICE` for ports < 1024) | Minimal grant |
| `seccompProfile.type` | `RuntimeDefault` (or `Localhost` with file) | Filter syscalls |
| `automountServiceAccountToken` (pod-level) | `false` unless app calls API | Reduces blast radius |
| `hostPID` / `hostNetwork` / `hostIPC` | `false` | No host namespace sharing |

**Pod Security Admission (PSA) — replaces deprecated PSP:**

| Profile | Allows | Use for |
|---|---|---|
| **`privileged`** | Anything | System components only |
| **`baseline`** | Minimally restrictive — blocks known escalations | Most app namespaces |
| **`restricted`** | Hardened — non-root, drop ALL caps, RuntimeDefault seccomp, no host namespaces | **Production default** for app workloads |

**Apply per namespace via labels:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit:   restricted
    pod-security.kubernetes.io/warn:    restricted
```

| Mode | Effect |
|---|---|
| `enforce` | Reject non-compliant pods |
| `audit` | Log violations (still admitted) |
| `warn` | Show warning to user (still admitted) |

> Use **all three modes** during rollout: `warn` first (give devs notice), then `enforce` (block).

**Capabilities reference (the ones you'll actually meet):**

| Capability | What it grants |
|---|---|
| `NET_BIND_SERVICE` | Bind to ports < 1024 |
| `NET_RAW` | Raw / packet sockets |
| `SYS_ADMIN` | Many kernel ops — **never grant in apps** |
| `SYS_PTRACE` | Trace processes — debug only |
| `CHOWN` | Change file ownership |
| `DAC_OVERRIDE` | Bypass file permission checks |
| `SETUID` / `SETGID` | Change UID/GID |

> Drop **ALL**, then add only what's required (rare).

**Runtime detection (when prevention fails):**

| Tool | What it does |
|---|---|
| **Falco** (CNCF) | eBPF/sysdig kernel rules — alerts on shell-in-container, write-to-/etc, unexpected egress |
| **Tetragon** (Cilium) | eBPF runtime security with kernel enforcement |
| **Tracee** | eBPF, lightweight |
| **Sysdig Secure** | Commercial SaaS, broad coverage |
| **Aqua Enforcer** | Commercial, in-cluster runtime guard |

**Sample Falco rules trigger on:**

| Event | Why |
|---|---|
| Shell spawned in container | Lateral movement signal |
| Writes to `/etc/passwd` | Persistence attempt |
| Unexpected outbound network | Data exfil / C2 |
| Modification of binary directories | Tampering |
| K8s API calls from a workload pod | Privilege escalation attempt |
| Sensitive file read (private keys) | Credential theft |

**Network / mesh layer (cross-ref):**

| Concern | See |
|---|---|
| NetworkPolicy default-deny | [k8s_storage / probes / docs](k8s_probes_liveness_readiness_startup_healthcheck.md) — and the zero-trust network cheatsheet |
| Service mesh mTLS | [microservices/service_mesh_istio_*](../../microservices/service_mesh_istio_sidecar_mtls.md) |
| Zero-trust posture | [zero_trust_network_security.md](zero_trust_network_security.md) |

**Rootless containers — host-side defense:**

| Engine | Rootless mode |
|---|---|
| **Podman** | Rootless by default — runs as user, uses subuid/subgid mapping |
| **Docker** | Rootless mode (`dockerd-rootless`) — opt-in |
| **containerd / nerdctl** | Rootless via `nerdctl --rootless` |
| **Kubernetes** | Rootless containers via `runAsNonRoot` (different scope from rootless engine) |

**Sandboxing the kernel (high-risk workloads):**

| Sandbox | What |
|---|---|
| **gVisor** | User-space kernel — strong isolation, perf cost |
| **Kata Containers** | Lightweight VM per pod — VM-level isolation |
| **Firecracker** | Micro-VM (used by AWS Lambda / Fargate internally) |
| **Standard runc** | Default Linux namespaces + cgroups |

> Use gVisor / Kata for **untrusted workloads** (multi-tenant SaaS, customer-uploaded code). Mainstream apps run on `runc`.

**Kubernetes-specific cheatsheet:**

| Need | Resource |
|---|---|
| Block deploy of unsigned images | Kyverno `verifyImages` policy / Sigstore policy-controller |
| Enforce non-root + drop caps | PSA `restricted` |
| Fine-grained policy beyond PSA | Kyverno / OPA Gatekeeper |
| Rotate image tags safely | Use digest + image-update controllers (Flux, Argo Image Updater) |
| Pre-pull images on nodes | DaemonSet that warms image cache |
| Limit per-namespace blast radius | ResourceQuota + LimitRange + PSA |

**Pitfalls / anti-patterns:**

| Pitfall | Effect |
|---|---|
| `latest` tag in production | Can't pin behavior; rollback ambiguous |
| Running as root inside container | Privilege escalation if exploited |
| `privileged: true` | Effective host root |
| `hostPath` mounts | Container reads / writes node filesystem |
| `sudo` inside container | Defeats the point of non-root |
| Image scanning but no enforcement | Scanners report, devs ignore |
| Skipping signature verification on deploy | Anyone with registry creds can swap image |
| One giant image with many concerns | Larger CVE surface, slower pulls |
| Using `apt-get install` without `--no-install-recommends` | Bloat + extra CVEs |
| Building secret into image (`ENV SECRET=...`) | Layered into image; extractable |
| Exposing `/var/run/docker.sock` to a container | Effective host root |
| Same image for dev + prod with debug tools | Bigger attack surface in prod |

**Deploy-time admission policy example (Kyverno):**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: require-signed-images }
spec:
  validationFailureAction: enforce
  rules:
    - name: verify
      match: { any: [ { resources: { kinds: [Pod] } } ] }
      verifyImages:
        - imageReferences: ["ghcr.io/org/*"]
          attestors:
            - entries:
                - keyless:
                    subjectRegExp: '^https://github.com/org/'
                    issuer: 'https://token.actions.githubusercontent.com'
```

**Quick checklist:**

| Check | Pass? |
|---|---|
| Multi-stage build | ✅ |
| Distroless / minimal base, pinned by digest | ✅ |
| Non-root user, read-only FS, dropped caps, RuntimeDefault seccomp | ✅ |
| Image scanned in CI; Critical/High blocks the build | ✅ |
| Image signed (cosign) and verified at admission | ✅ |
| SBOM generated and stored | ✅ |
| Pod Security Admission at `restricted` for app namespaces | ✅ |
| NetworkPolicy default-deny per namespace | ✅ |
| Runtime detection (Falco / Tetragon) deployed | ✅ |
| `automountServiceAccountToken: false` unless needed | ✅ |
| No host namespaces, no `privileged: true`, no `hostPath` in apps | ✅ |
| Continuous re-scan in registry (CVEs land daily) | ✅ |

**Rule of thumb:** **distroless + multi-stage + pinned digest** for the image, **`runAsNonRoot` + drop ALL caps + read-only FS + RuntimeDefault seccomp** for the runtime, **scan in CI + sign with cosign + verify at admission** for the supply chain, **PSA `restricted` + NetworkPolicy default-deny** for the cluster, **Falco/Tetragon** when you need to detect what got past prevention. Build small, run small, verify everything, monitor what's left.
