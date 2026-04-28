### Docker Registry & Image Scanning

**Cross-ref:** for build-side hardening see [container_security_image_scanning_*.md](../security/container_security_image_scanning_trivy_rootless_pss.md). For artifact / cache / promotion strategy see [ci_cd/artifact_management_caching_*.md](../ci_cd/artifact_management_caching_docker_registry_versioning.md). This file focuses on the **registry workflow** itself.

**Registry choice — pick by ecosystem:**

| Registry | Strengths | Watchouts |
|---|---|---|
| **Docker Hub** | Universal default | Rate limits (100 pulls / 6 h anonymous, 200 / 6 h authenticated free) |
| **AWS ECR** | IAM-integrated; lifecycle policies; scan-on-push (Basic + Enhanced) | Per-region; auth via STS token |
| **AWS ECR Public** | No-auth public images | Limited free tier |
| **GHCR** (GitHub Container Registry) | Free for public; tight GH Actions integration; fine-grained PATs | OIDC trust easy from Actions |
| **GCP Artifact Registry** | OCI for many formats (Docker, Maven, npm, Helm); per-region | Replace older Container Registry |
| **Azure ACR** | Geo-replication; Azure-integrated | Premium tier needed for replication |
| **Harbor** | OSS, on-prem, scanning + replication | Self-host; Postgres + Redis + storage |
| **JFrog Artifactory** | Multi-format enterprise | Commercial |
| **Quay** (Red Hat) | Replication, signing | Commercial |
| **Self-hosted Distribution (registry:2)** | Bare-bones OCI registry | No auth, scanning, or UI by default |

**Authentication patterns:**

| Pattern | Use |
|---|---|
| `docker login` | Interactive |
| `~/.docker/config.json` with credsStore | Persistent (Docker Desktop) |
| `aws ecr get-login-password \| docker login` | ECR rotated tokens (12 h) |
| `gh auth token \| docker login ghcr.io -u <user> --password-stdin` | GHCR (PAT or `GITHUB_TOKEN`) |
| GCP service account → `gcloud auth print-access-token` | Artifact Registry |
| Azure AD service principal | ACR |
| **OIDC federation from CI** (GitHub Actions / GitLab) | No long-lived secrets |
| Workload identity (K8s → cloud) | In-cluster pulls |

**Pushing — workflow:**

```bash
# Build with metadata + multi-arch
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/org/app:1.2.3 \
  --tag ghcr.io/org/app:abc1234 \
  --label org.opencontainers.image.revision=abc1234 \
  --label org.opencontainers.image.source=https://github.com/org/app \
  --provenance=true --sbom=true \
  --push .

# Inspect what landed
docker buildx imagetools inspect ghcr.io/org/app:1.2.3
```

**Tagging strategy:**

| Tag | Mutable? | Use |
|---|---|---|
| `:1.2.3` (semver) | Immutable convention | Releases — pinned by clients |
| `:abc1234` (short SHA) | Immutable | Every build, traceable to commit |
| `:main` / `:develop` | **Mutable** | Auto-deploy targets for dev / staging |
| `:latest` | Mutable | **Never in production** |
| `:pr-123` | Mutable | Per-PR preview |
| `@sha256:…` (digest) | **Truly immutable** | Strongest pin — survives tag mutation |
| `:1.2.3-distroless`, `:1.2.3-alpine` | Variant suffix | Build flavor |
| `:slim`, `:debug` | Floating variant | Use SHA / version when pinning |

**Image references — formats:**

| Form | Example |
|---|---|
| Implicit hub | `ubuntu:24.04` → `docker.io/library/ubuntu:24.04` |
| Hub user namespace | `username/myapp:1.0` |
| Custom registry + path | `123.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0` |
| Multi-segment path | `ghcr.io/org/team/app:1.2.3` |
| Digest pin | `ghcr.io/org/app@sha256:e3b0c…` |

**Inspecting a remote image without pulling:**

```bash
docker buildx imagetools inspect ghcr.io/org/app:1.2.3
crane manifest ghcr.io/org/app:1.2.3
skopeo inspect docker://ghcr.io/org/app:1.2.3
```

| Tool | Use |
|---|---|
| `crane` | Read/write OCI registries from CLI |
| `skopeo` | Copy / inspect / list across registries |
| `oras` | Push arbitrary OCI artifacts (charts, SBOMs, signatures) |

**Image scanning — what runs where:**

| Stage | Scanner | Goal |
|---|---|---|
| Pre-build (lint Dockerfile) | hadolint | Catch obvious issues |
| Pre-push (in CI) | Trivy / Grype / Docker Scout | Critical/High CVEs block merge |
| On-push (in registry) | ECR scan-on-push, Harbor Trivy | Immediate visibility |
| Continuous (in registry) | ECR Enhanced, Harbor scheduled | New CVEs detected over time |
| Pre-admission (cluster) | Kyverno / Sigstore policy-controller | Block deploy of unscanned/vulnerable images |
| Runtime | Falco / Tetragon / Sysdig | Active threat detection (not scanning) |

**Trivy quick reference:**

```bash
# Image scan
trivy image ghcr.io/org/app:1.2.3
trivy image --severity CRITICAL,HIGH --exit-code 1 ghcr.io/org/app:1.2.3
trivy image --ignore-unfixed ghcr.io/org/app:1.2.3   # skip unfixable CVEs
trivy image --format spdx-json -o sbom.json ghcr.io/org/app:1.2.3

# Project / IaC scan
trivy fs .
trivy config terraform/
trivy k8s --report=summary cluster

# Per-finding suppress
trivy image --ignorefile .trivyignore ghcr.io/org/app:1.2.3
```

**`.trivyignore` example:**

```
# Reason: false positive — not exercised in our context
CVE-2023-12345

# Reason: vendor patch landing 2024-05-01
CVE-2024-9999
```

**Severity prioritization — beyond CVSS:**

| Signal | Why |
|---|---|
| **CVSS** | Base severity — start here |
| **EPSS** (Exploit Prediction Scoring) | Probability of exploitation in next 30 days |
| **CISA KEV** (Known Exploited Vulnerabilities) | "This is being actively exploited" |
| **Reachability** (Snyk Code, Endor Labs) | Is the vuln in code your app actually executes? |
| **Fix available** | A 9.8 with no patch is harder to act on |
| **Distance from internet** | Internal-only services have lower urgency |

> Don't fix by raw CVSS rank. **Reachability + KEV + fix-available** is the right priority signal.

**Image lifecycle policies — per registry:**

| Registry | Mechanism | Example rule |
|---|---|---|
| **AWS ECR** | JSON lifecycle policy | "Keep last 30 tagged images; delete untagged > 7 days" |
| **GCR / Artifact Registry** | Cleanup policies | Per-tag patterns |
| **GHCR** | Retention policy via GH Packages | Per-package retention |
| **Harbor** | Tag retention rules | Per-project, per-tag-pattern |
| **ACR** | Lifecycle / purge | Tag age, count |
| **Quay** | Auto-prune policies | Per-repo |

**ECR lifecycle policy (JSON shape):**

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 30 tagged",
      "selection": { "tagStatus": "tagged", "tagPatternList": ["v*"], "countType": "imageCountMoreThan", "countNumber": 30 },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Delete untagged after 7 days",
      "selection": { "tagStatus": "untagged", "countType": "sinceImagePushed", "countUnit": "days", "countNumber": 7 },
      "action": { "type": "expire" }
    }
  ]
}
```

**Replication & geo-distribution:**

| Need | Approach |
|---|---|
| Pull latency in remote regions | Per-region registry replicas (ECR cross-region replication, ACR geo-replication) |
| Cluster pulls without internet | In-cluster mirror (Harbor, Distribution, kraken) |
| Air-gapped environments | Skopeo sync to internal registry |
| Disaster recovery | Replicated registry + tagged images stored elsewhere |

**Image signing (cosign / Sigstore) — quickref:**

```bash
# Keyless (OIDC, recommended)
cosign sign ghcr.io/org/app:1.2.3

# Verify
cosign verify \
  --certificate-identity-regexp '^https://github.com/org/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/org/app:1.2.3

# Attach SBOM as attestation
cosign attest --predicate sbom.spdx.json --type spdxjson ghcr.io/org/app:1.2.3
```

| Concept | Detail |
|---|---|
| Signature stored in registry alongside image | OCI registry holds it via `sha256-…sig` tag |
| Rekor transparency log | Public log of every signing event |
| Fulcio | Short-lived OIDC-backed certs |
| `cosign verify` at admission time | Kyverno / policy-controller integration |

**SBOM workflow:**

| Step | Action |
|---|---|
| Generate at build | `syft ghcr.io/org/app:1.2.3 -o spdx-json > sbom.json` (or `trivy image --format spdx-json`) |
| Attach as attestation | `cosign attest --predicate sbom.json --type spdxjson <image>` |
| Fetch later | `cosign download attestation <image>` |
| Query | "Is log4j 2.14.x in any of our running images?" — query SBOM index |

**Pull strategies:**

| `imagePullPolicy` (K8s) | Effect |
|---|---|
| `Always` | Always check registry; required if you use mutable tags |
| `IfNotPresent` | Use cached if present; default with non-`latest` tag |
| `Never` | Local cache only; offline / air-gapped |

> Pin by digest (`ghcr.io/org/app@sha256:…`) and `imagePullPolicy: IfNotPresent` is the strongest combo — fully reproducible, no extra registry hits.

**Pull rate-limit mitigation:**

| Strategy | Detail |
|---|---|
| Authenticate to Docker Hub | Higher quota |
| Use a pull-through cache (ECR / Harbor / kraken) | One pull per cluster, not per node |
| Mirror critical base images to your registry | Independence + speed |
| Use registry mirrors in K8s nodes | Configure containerd `registry.mirrors` |

**Cleaning up local images:**

```bash
docker image prune                # untagged
docker image prune -a             # all unused
docker system prune --volumes     # everything dangling (careful)
docker buildx prune               # buildx cache
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `:latest` deployed to prod | Can't reproduce; can't roll back exactly |
| Mutable tags + `IfNotPresent` | Stale image silently served |
| No retention policy | Storage bill grows unbounded |
| Anonymous Docker Hub pulls in CI | Rate-limited mid-build |
| Pushing without scanning | Vulnerable images in prod |
| Ignoring `--ignore-unfixed` differently across teams | Inconsistent gating |
| Not pinning by digest for security-sensitive bases | Tag could be re-pointed |
| Long-lived service-account creds for registry | Compromise = pull/push |
| Image in private registry but pull secret missing | `ImagePullBackOff` in K8s |
| Multi-arch tag where only `amd64` exists | ARM nodes fail to pull |
| Layered SBOMs / signatures not promoted with the image | Verification fails after promotion |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Public OSS images | Docker Hub or GHCR |
| AWS-native deployment | ECR + IAM + scan-on-push |
| GitHub-centric flow | GHCR + OIDC from Actions |
| Air-gapped / on-prem | Harbor or Distribution + skopeo sync |
| Multi-format artifacts (Helm, Maven, npm too) | Artifact Registry / Artifactory / Harbor |
| Strict supply-chain controls | Harbor + Trivy + cosign + policy-controller |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Production image tagged with semver + SHA | ✅ |
| `:latest` not used in deploys | ✅ |
| Registry has lifecycle / retention policy | ✅ |
| Scan-on-push enabled | ✅ |
| CI scanner blocks Critical/High | ✅ |
| Image signed (cosign) | ✅ |
| SBOM attached | ✅ |
| Pull-through cache for Docker Hub | ✅ |
| Pull credentials via OIDC, not long-lived | ✅ |
| Multi-arch build if heterogeneous nodes | ✅ |
| Verification at admission time (Kyverno / policy-controller) | ✅ |

**Rule of thumb:** **never `:latest` in production.** Tag by **semver + git SHA**, **sign with cosign**, **attach SBOM**, **verify at admission**. **Lifecycle policies** in every registry. **Trivy or Grype in CI** blocking Critical/High; **continuous re-scan in the registry** for newly-published CVEs. Use **OIDC federation** to avoid long-lived registry credentials in CI.
