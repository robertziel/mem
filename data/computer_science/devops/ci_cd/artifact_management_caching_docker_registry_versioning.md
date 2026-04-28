### CI/CD — Artifact Management, Caching, Versioning, Registries

**Artifact taxonomy — what flows through your pipeline:**

| Type | Examples | Storage |
|---|---|---|
| Container images | `app:abc123` | ECR / GCR / GHCR / Harbor / Docker Hub |
| Build outputs | Compiled binaries, JAR / WAR, bundled JS | S3 / GCS / artifact registry |
| Language packages | npm tgz, gem, wheel, jar | npm / RubyGems / PyPI / Artifactory |
| Helm charts | `chart-1.2.3.tgz` | OCI registry / Helm repo |
| Terraform modules | Versioned modules | Terraform registry / Git tags |
| SBOMs | SPDX / CycloneDX | Stored alongside images |
| Image signatures | cosign signatures | Sigstore Rekor / signed registry |
| Test reports | JUnit XML, coverage HTML | CI-provided storage |
| Dataset / model artifacts | ML weights, datasets | DVC / MLflow / S3 |

**Build-once, deploy-everywhere — the central principle:**

```
PR build ── image:abc123 ──► registry
                              │
                  ┌───────────┼────────────┐
                  ▼           ▼            ▼
                staging   pre-prod      production
              (same image)
```

| Rule | Why |
|---|---|
| **Same image across environments** | If staging passes, prod can't differ |
| Configuration via env vars / ConfigMaps / Secrets | Per-env behavior without rebuild |
| Never rebuild for prod | Defeats validation done in earlier envs |
| Tag immutably (git SHA / semver) | Reproducible deploys |

**Versioning strategies:**

| Strategy | Tag form | Use |
|---|---|---|
| **Git SHA** | `app:abc1234` (short SHA) | Default for every build |
| **Semantic version** | `app:1.2.3` | Releases |
| **Major / minor floating** | `app:1.2`, `app:1` | Risky in prod (mutable) |
| **Branch-based** | `app:main`, `app:pr-123` | Dev / preview |
| **Date-based** | `app:2024-04-15` | Legacy / audit |
| **`latest`** | `app:latest` | **Never in production** — ambiguous, not reproducible |
| **Digest** | `app@sha256:…` | Strongest pin — survives tag mutation |

> **Combine SHA + version**: `app:1.2.3-abc1234`. SHA for traceability, version for humans.

**Caching — what to cache, where, and why it speeds things up:**

| Layer | What to cache | Speedup |
|---|---|---|
| **Dependency cache** | `node_modules`, `.venv`, `vendor/`, `.gradle`, `~/.cargo` | Skip re-install on unchanged manifests |
| **Build cache** | Compiler output, `.cargo/build`, `target/`, Bazel/Buck cache | Skip recompilation |
| **Docker layer cache** | Image layers from previous builds | Skip rebuilding layers with cached input |
| **Test result cache** | Per-file test results | Skip tests where inputs didn't change (Bazel, Nx) |
| **Linting / formatting cache** | Per-file analyzed state | Run only on changed files |
| **CDN / proxy cache for npm/pip/gem** | Mirror upstream | Independent of upstream availability |

**Cache key design — the 80% of CI cache success:**

| Key strategy | Detail |
|---|---|
| Hash of lockfile | `${{ hashFiles('package-lock.json') }}` — cache busts only when deps actually change |
| Combine OS + lang version | `${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}` |
| Restore-keys ladder | Try exact, then progressively looser |
| Per-branch isolation | `${{ github.ref }}-...` for hot branches |
| Cache scopes (per-repo, per-org) | Some CIs allow shared org-level caches |

**GitHub Actions cache example:**

```yaml
- uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**Docker layer caching strategies:**

| Strategy | How |
|---|---|
| **Inline cache** | `--cache-from=type=inline` baked into the image |
| **Registry cache** | `--cache-from=type=registry,ref=...` separate cache image |
| **GHA cache** | `--cache-from=type=gha,mode=max` (GitHub-hosted) |
| **S3 / GCS cache** | `--cache-from=type=s3,...` self-hosted |
| **BuildKit local cache** | `--cache-from=type=local,src=/cache` |
| **Image-internal cache mounts** | `RUN --mount=type=cache,target=/var/cache/apt ...` |

**`docker buildx` reference (modern way):**

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --cache-from=type=registry,ref=ghcr.io/org/app:cache \
  --cache-to=type=registry,ref=ghcr.io/org/app:cache,mode=max \
  --tag ghcr.io/org/app:${SHA} \
  --tag ghcr.io/org/app:${BRANCH} \
  --push .
```

| Flag | Effect |
|---|---|
| `--platform` | Multi-arch (QEMU or native) |
| `--cache-to=mode=max` | Save **all** layers, not just the final |
| `--push` | Push directly (skips local store) |
| `--provenance=true` | SLSA provenance attestation |
| `--sbom=true` | Embed SBOM |

**Test parallelism — split for speed:**

| Strategy | Detail |
|---|---|
| **Static split** by file hash | `tests[0..N/3]`, deterministic |
| **Dynamic split** by historical timing | Balance based on observed durations |
| **Per-file sharding** (Jest, RSpec parallel-tests) | One process per shard |
| **Distributed across machines** (Knapsack / CircleCI / Buildkite) | Cross-machine balancing |
| **Selective testing** (Bazel, Nx, only-changed) | Skip tests for unchanged paths |

**Test result merging:**

| Format | Tool |
|---|---|
| JUnit XML | Universal — most CI UIs render it |
| LCOV / Cobertura | Coverage merge (Codecov, Coveralls) |
| Allure | Rich HTML report |
| TestRail / Reportportal | Test management |

**Registry choices:**

| Registry | Strengths |
|---|---|
| **Docker Hub** | Universal; rate-limited free tier |
| **GHCR** (GitHub Container Registry) | Tight GitHub integration, fine-grained PATs |
| **AWS ECR** | IAM-integrated, lifecycle policies, scan on push |
| **GCP Artifact Registry** | GCP-integrated, supports OCI for many types |
| **Azure ACR** | Azure-integrated, geo-replication |
| **Harbor** | OSS, on-prem, vulnerability scanning, replication |
| **JFrog Artifactory** | Multi-format, enterprise |
| **Quay** | Red Hat-backed; replication |

**Image lifecycle policies — control storage cost:**

| Policy | Example |
|---|---|
| Keep latest N tagged images | "Keep last 30 by SHA" |
| Delete untagged after N days | Common; cleans up failed builds |
| Retain semver tags forever | `1.2.3`, `2.0.0`, ... |
| Delete dev / PR images after merge / close | "PR-* images expire 14 days after PR closed" |
| Geo-replicate prod tags only | Don't replicate dev images cross-region |

**Artifact retention by type:**

| Artifact | Retention |
|---|---|
| Production images | Forever (signed, SBOM-attached, audit) |
| Staging / dev images | 30–90 days |
| Untagged images | 7 days |
| Test reports | 30 days (CI standard) |
| Coverage reports | 90 days |
| SBOMs | Match the image they describe |
| Signatures | Match the image |
| Source archives | Forever (release tags) |

**Promotion vs rebuild:**

| Pattern | Detail |
|---|---|
| **Promote (the right way)** | Same image, new tag (`:staging` → `:prod`) — `docker tag` + push, or registry promote API |
| Rebuild for prod | **Wrong** — invalidates earlier validation |
| Re-tag at deploy time | Common: SHA tag stays, env tags float |
| Cosign sign on promote | `cosign sign ghcr.io/org/app:prod` after promotion |

**Provenance & supply chain:**

| Concept | Detail |
|---|---|
| **SLSA** (Supply-chain Levels for Software Artifacts) | Provenance attestation framework |
| **SBOM** (SPDX / CycloneDX) | Software Bill of Materials |
| **cosign** | Sign + verify images, blobs, SBOMs |
| **Sigstore Rekor** | Transparency log |
| **Fulcio** | Keyless OIDC-based signing |
| **In-toto** | End-to-end pipeline attestations |
| **Provenance attestation** | "Built from this commit, this builder, these inputs" |

**Build attestations to attach:**

| Attestation | What it asserts |
|---|---|
| Provenance | Where + how the image was built |
| SBOM | What's inside the image |
| Vulnerability scan | What CVEs were found at build time |
| Signature | Image is from a trusted builder |
| Test results | Tests passed at build time |

**Dependency caching — language-by-language:**

| Stack | Cache path | Key |
|---|---|---|
| Node | `~/.npm`, `node_modules` | `package-lock.json` hash |
| Python | `~/.cache/pip`, `.venv` | `poetry.lock` / `requirements.txt` hash |
| Go | `~/go/pkg/mod`, `~/.cache/go-build` | `go.sum` hash |
| Rust | `~/.cargo`, `target` | `Cargo.lock` hash |
| Java (Gradle) | `~/.gradle/caches` | `build.gradle` + `gradle-wrapper.properties` |
| Java (Maven) | `~/.m2/repository` | `pom.xml` hash |
| Ruby | `vendor/bundle` | `Gemfile.lock` hash |
| Dart / Flutter | `.pub-cache` | `pubspec.lock` hash |

**Pipeline patterns — common shapes:**

| Pattern | Stages |
|---|---|
| **PR validation** | Lint → unit → build → integration → security scan |
| **Mainline build** | Same as PR + push image + promote-to-staging |
| **Release** | Cut tag → build with version → sign → SBOM → attestation → promote |
| **Hotfix** | Branch from prod tag → minimal change → expedited path |
| **Canary deploy** | Build → deploy 1% → verify metrics → expand |
| **Blue/green** | Build → deploy green → smoke test → swap → keep blue 1h |

**Cost optimization:**

| Lever | Effect |
|---|---|
| Cache deps + build artifacts | 5–20× pipeline speedup, less compute time |
| Multi-stage Docker + small base | Smaller pushes/pulls, less egress |
| Self-hosted runners for heavy jobs | Cheaper than per-minute hosted |
| Spot / preemptible runners | 50–90% off |
| Per-arch matrix only when needed | Multi-arch is expensive |
| Image deduplication (OCI) | Layer-level reuse across images |
| Lifecycle policies | Stop paying for stale artifacts |
| ARM (Graviton) for runners | ~20% cheaper |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| `docker build -t app:latest` and deploy | Race condition; can't roll back exactly |
| Different image per environment | Validation in staging proves nothing about prod |
| `npm install` (not `npm ci`) | Non-deterministic; cache mismatches |
| Cache key without lockfile hash | Cache returns stale deps |
| No retention policy | Registry bills explode |
| Cache poisoning (untrusted writes to cache) | Inject bad bytes into every later build |
| Caching across unrelated repos | Hidden coupling |
| Single global cache | Hot key contention |
| Test parallelism without flaky-test handling | False failures |
| Manual tagging from local laptop | Bypass CI; missing provenance |

**Deploy-time verification:**

| Check | Why |
|---|---|
| Image signature verified | Supply chain |
| SBOM matches what's deployed | Audit |
| Health probes pass before promote | Avoid bad rollouts |
| Smoke tests against canary | User-facing safety |
| Rollback path tested | "What's the command if this fails?" |

**Tooling map:**

| Concern | Tool |
|---|---|
| CI runner | GitHub Actions / GitLab CI / CircleCI / Buildkite / Jenkins / Argo Workflows / Tekton |
| Build | `buildx`, BuildKit, Bazel, Nx, Turbo, Earthly |
| Cache backends | GHA, S3, GCS, registry, BuildKit, ccache, sccache |
| Registry | ECR / GCR / GHCR / Harbor / Quay / Artifactory |
| Signing | cosign, Notary v2 |
| SBOM | syft, Trivy SBOM |
| Scanning | Trivy, Grype, Snyk, Dockle, Docker Scout |
| Promotion | Argo CD / Flux (GitOps), tag promotion APIs |
| Test parallelism | Knapsack Pro, CircleCI auto-balance, Bazel test-sharding |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Build once, promote across envs | ✅ |
| Tag by SHA + version, never just `latest` | ✅ |
| Dependency cache keyed by lockfile | ✅ |
| Docker layer cache (registry or GHA) | ✅ |
| Image signed with cosign | ✅ |
| SBOM generated + attached | ✅ |
| Lifecycle policies in registry | ✅ |
| Lockfile committed and used (`npm ci`, `bundle --frozen`, etc.) | ✅ |
| Registry retention reviewed quarterly | ✅ |
| Multi-arch builds via buildx (if needed) | ✅ |
| Test parallelism configured | ✅ |
| Provenance / SLSA attestation in pipeline | ✅ |

**Rule of thumb:** **build once, deploy everywhere** — same image flows from PR → staging → prod via promotion, never rebuild. **Tag by git SHA + semver**, never `latest`. **Cache dependencies** keyed by lockfile hash, **cache Docker layers** via registry or GHA cache. **Sign images, attach SBOMs, attach provenance** — it's the modern supply-chain baseline. **Lifecycle policies on every registry** stop the bill from creeping forever upward.
