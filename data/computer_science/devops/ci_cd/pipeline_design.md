### CI/CD Pipeline Design

**Cross-ref:** for artifact / cache / promotion strategy see [artifact_management_caching_*.md](artifact_management_caching_docker_registry_versioning.md). For container-specific concerns see [container_security_image_scanning_*.md](../security/container_security_image_scanning_trivy_rootless_pss.md).

**CI vs CD vs CD — three different things:**

| Term | What it means |
|---|---|
| **CI** (Continuous Integration) | Every commit/PR triggers automated build + test on a shared branch |
| **Continuous Delivery** | Every change is **deployable** — manual gate to ship to prod |
| **Continuous Deployment** | Every change that passes pipeline is **auto-deployed** to prod |

> Many teams say "CI/CD" meaning "we have CI plus continuous **delivery**" — push-button to prod, but human approval. True continuous deployment requires very mature testing + observability.

**Standard pipeline stages:**

```
Commit ── Lint ── Build ── Unit ── Integration ── Scan ── Package ── Deploy Staging ── E2E ── Deploy Prod ── Verify
        (fast)  (image)  (fast)   (medium)        (sec)  (sign)                          (slow)               (post)
```

**Stage-by-stage purpose:**

| Stage | Purpose | Gate on |
|---|---|---|
| **Lint / format** | Style + obvious bugs | Hard fail |
| **Static analysis** | Semantic checks (TypeScript, Go vet, mypy) | Hard fail |
| **Build** | Compile, bundle, build image | Hard fail |
| **Unit tests** | Fast, isolated tests | Hard fail |
| **Security: SAST** (code) | Semgrep / CodeQL / Brakeman | Block on Critical/High |
| **Security: SCA** (deps) | Snyk / Dependabot / Trivy fs | Block on Critical/High |
| **Security: secret scan** | gitleaks / trufflehog | Hard fail on any hit |
| **Security: IaC scan** | Checkov / tfsec / Trivy config | Block on policy violations |
| **Security: image scan** | Trivy / Grype / Docker Scout | Block on Critical/High |
| **Integration tests** | Test with real DB / queue / cache | Hard fail |
| **Package + sign** | Tag image, generate SBOM, cosign sign | Hard fail |
| **Deploy staging** | Production-like env | Hard fail on deploy errors |
| **E2E / smoke tests** | Critical user flows in staging | Hard fail |
| **DAST scan** | Dynamic security against staging | Block on findings |
| **Manual approval** (Continuous Delivery) | Human sign-off | Required for prod |
| **Deploy prod** | Canary / blue-green / rolling | Auto-rollback on health check failure |
| **Post-deploy verification** | Health checks, smoke tests, error-rate alerts | Trigger rollback if breached |

**Pipeline best-practice rules:**

| Rule | Why |
|---|---|
| **Fail fast** — order stages by speed | Don't run a 10-min integration test after a known-broken lint |
| **Parallelize independent stages** | Lint, unit, SAST, SCA can all run together |
| **Cache dependencies** | Skip re-install on unchanged manifests |
| **Cache Docker layers** | Skip re-build of unchanged stages |
| **Build artifact once** | Promote it across environments — never rebuild |
| **Immutable artifacts** | Same image in staging and prod |
| **Pin versions** of build tools, base images, actions | Reproducibility |
| **Pipeline < 10 min for PR feedback** | Devs context-switch faster than that |
| **Idempotent steps** | Re-runs are safe |
| **Observable pipeline** | Per-step duration, failure rate, flake rate |
| **One canonical pipeline definition** | No copy-paste forks per service |

**Fail-fast ordering (cheapest first):**

| Order | Stage | Typical duration |
|---|---|---|
| 1 | Lint / format | 5–30 s |
| 2 | Static analysis (TS / vet / mypy) | 10–60 s |
| 3 | Unit tests | 30 s – 3 min |
| 4 | Build (with cache) | 30 s – 3 min |
| 5 | SCA (dependency scan) | 30 s – 2 min |
| 6 | SAST (code scan) | 1–5 min |
| 7 | Integration tests | 2–10 min |
| 8 | Image scan | 1–3 min |
| 9 | E2E (in staging) | 5–30 min |
| 10 | DAST | 10–60 min |

**Pipeline-as-code:**

| Tool | Format |
|---|---|
| **GitHub Actions** | `.github/workflows/*.yml` |
| **GitLab CI** | `.gitlab-ci.yml` |
| **Jenkins** | `Jenkinsfile` (Groovy) |
| **CircleCI** | `.circleci/config.yml` |
| **Buildkite** | `.buildkite/pipeline.yml` |
| **Argo Workflows** | Kubernetes CR |
| **Tekton** | Kubernetes CR |
| **Drone CI** | `.drone.yml` |
| **Azure Pipelines** | `azure-pipelines.yml` |
| **Bitbucket Pipelines** | `bitbucket-pipelines.yml` |

**Trigger types:**

| Trigger | Use |
|---|---|
| Push to branch | Default for trunk-based |
| PR opened / updated | PR validation pipeline |
| Tag push (e.g. `v1.2.3`) | Release pipeline |
| Manual / `workflow_dispatch` | Ad-hoc deploys |
| Cron / scheduled | Nightly builds, security re-scans, dep updates |
| External webhook | Trigger on upstream artifact change |
| `repository_dispatch` (GitHub) | Cross-repo pipelines |

**Environment promotion:**

```
Build (once) ──► Dev (auto)  ──► Staging (auto)  ──► Production (manual gate or auto)
```

| Practice | Detail |
|---|---|
| Same artifact across all envs | Validation in earlier env proves the bytes |
| Per-env config via env vars / ConfigMaps | Behavior, not bytes, varies |
| Infrastructure deploy gated separately | Code deploy ≠ infra deploy |
| Promote via tag move, not rebuild | `docker tag old:sha new:prod` + push |
| Blue-green / canary at the prod stage | Reduce blast radius |
| Auto-rollback on post-deploy alarm | Health check or SLO breach |

**Deploy strategies — pick by risk profile:**

| Strategy | Mechanism | Use |
|---|---|---|
| **Recreate** | Stop all old, start all new | Brief downtime acceptable |
| **Rolling update** | Replace pods gradually | Default for K8s Deployments |
| **Blue / green** | Two parallel envs; switch traffic | Easy rollback; double the capacity briefly |
| **Canary** | 1% → 5% → 25% → 100% | Detect regressions early |
| **A/B / dark launch** | Subset gets new code | Feature-flag-driven |
| **Shadow / mirror** | New version receives copy of traffic, doesn't respond | Verify behavior without user impact |

**Canary analysis automation:**

| Tool | Detail |
|---|---|
| **Argo Rollouts** | Canary / blue-green for K8s with metric-based gates |
| **Flagger** | Same niche; deeper Prometheus integration |
| **Spinnaker** | Heavyweight CD platform with pipeline orchestration |
| **AWS CodeDeploy** | EC2 / ECS / Lambda canary built-in |
| **Datadog Service Watcher / New Relic CodeStream** | Metric gates from APM |

**PR validation vs main pipeline:**

| Concern | PR pipeline | Main / release pipeline |
|---|---|---|
| Goal | Catch bad changes before merge | Build, sign, deploy |
| Speed target | < 10 min | Can be longer |
| Tests | All fast tests; subset of slow | Full suite |
| Build | Cached aggressively | Fresh sometimes |
| Deploy | Optional preview environment | Yes |
| Security gates | SAST + SCA + secret scan | Plus image scan + SBOM + sign |

**Preview / ephemeral environments:**

| Pattern | Detail |
|---|---|
| Per-PR namespace in K8s | Spin up + tear down with PR |
| Preview URL in PR comment | Click to test |
| Tagged image deployed to preview | Same artifact path |
| Auto-cleanup after merge / close + N days | Cost control |
| Tools | Vercel / Netlify / Render / GH Actions + Argo CD / OkTeto / Coder |

**Caching — what + how:**

| Cache | Detail |
|---|---|
| Dependency cache (`node_modules`, `.venv`, etc.) | Keyed by lockfile hash |
| Build cache (compiler intermediate) | `target/` for Rust, `.gradle` for JVM |
| Docker layer cache | Registry, GHA cache, BuildKit |
| Test result cache | Bazel / Nx / Turbo skip unchanged |
| Linter cache | ESLint, Ruff, Rubocop |

**Test parallelism:**

| Strategy | Detail |
|---|---|
| Static split (file-based) | Deterministic; can be unbalanced |
| Dynamic split (timing-based) | Better load balance (Knapsack, CircleCI auto) |
| Per-suite shard | One process per shard |
| Distributed across machines | CI runner farm |
| Selective testing (only-changed) | Bazel, Nx, Turborepo |

**Observability — track these for the pipeline itself:**

| Metric | Why |
|---|---|
| Total pipeline duration p50 / p95 | Dev productivity |
| Per-stage duration trend | Spot creep before it breaks SLA |
| Failure rate per pipeline | Reliability health |
| Flaky-test rate | Trust in CI signal |
| Queue time (waiting for a runner) | Capacity issue |
| Cost per run | Self-hosted runner / SaaS bill |
| Lead time for change | DORA metric |
| Deploy frequency | DORA metric |
| Change failure rate | DORA metric |
| MTTR for deploy failures | DORA metric |

**DORA metrics — the four key signals:**

| Metric | Healthy (Elite) |
|---|---|
| **Deployment frequency** | Multiple per day |
| **Lead time for changes** | Hours |
| **Change failure rate** | < 5% |
| **Time to restore service** | < 1 hour |

**Secrets management in pipelines:**

| Pattern | Detail |
|---|---|
| **OIDC federation** to cloud | No long-lived AWS / GCP keys in CI |
| Short-lived tokens | Vault / cloud secret managers |
| Per-pipeline / per-job scopes | Limit blast radius |
| Mask secrets in logs | Built-in for most CIs |
| Never in `env` of build stage | Bakes into image history |
| Use BuildKit `--mount=type=secret` | Secrets never land in any layer |
| Pre-commit secret scan + push protection | Stops accidental commits |

**Branch / promotion strategy interaction:**

| Strategy | Pipeline shape |
|---|---|
| Trunk-based | Every commit to `main` triggers build + deploy |
| GitHub Flow | PR pipeline + main pipeline; merge → deploy |
| GitFlow | More pipelines: feature, develop, release, main |
| Release branch | Build + sign happen at branch cut + tag |
| GitOps (Flux / Argo CD) | CI builds + pushes; CD reconciles cluster state from git |

**Common pipeline pitfalls:**

| Pitfall | Effect |
|---|---|
| Too-long pipelines (> 30 min) | Devs disable it locally |
| One mega-job that does everything | Slow + hard to retry partial failure |
| Caching keys that don't change | Stale dependencies |
| Caching too eagerly (across unrelated PRs) | Coupling |
| Tests run against shared mutable env | Flakes |
| No retry on flaky steps | False reds |
| Always-retry without flake quarantine | Hidden flake rot |
| Build secrets in plain env vars | Logged or leaked |
| Same Docker tag used for prod + dev | Race; can't roll back |
| Manual deploy steps | Drift; not reproducible |
| No rollback path | Outages stretch |
| No post-deploy verification | Issues only surface to users |

**Quality gates (recommended minimums):**

| Gate | Block on |
|---|---|
| Lint / format | Any failure |
| Type check | Any failure |
| Unit tests | Any failure |
| Code coverage | Below configured threshold (warn, not block, often) |
| SAST | Critical / High |
| SCA (deps) | Critical / High in newly added or upgraded deps |
| Secret scan | Any |
| IaC scan | Critical / High |
| Image scan | Critical / High |
| Integration tests | Any failure |
| Performance regression | > X% latency increase |
| E2E smoke | Any |

**Rollback strategy — cheap and tested:**

| Strategy | Detail |
|---|---|
| Tag-move rollback | `docker tag prod:N-1 :prod && push` |
| K8s `kubectl rollout undo` | Built-in for Deployments |
| Blue-green flip | Switch back to old stack |
| Feature flag kill | Disable new behavior without redeploying |
| DB migration safe-by-construction | Backwards-compatible migrations only |
| Test rollback in staging quarterly | Don't discover broken rollbacks during incident |

**Pipeline patterns:**

| Pattern | Use |
|---|---|
| **Monorepo with selective build** | Bazel / Nx / Turborepo — only affected services rebuild |
| **Fan-out fan-in** | Parallel stages → join → final stage |
| **Approval-gated prod deploy** | Manual button after staging smoke |
| **Scheduled re-builds** | Catch new CVEs in base images |
| **Dependency update bots** (Dependabot, Renovate) | Automated PRs |
| **Auto-merge on green** | When all gates pass |
| **GitOps reconciliation loop** | Argo CD / Flux — declarative state |

**Self-hosted vs SaaS runners:**

| Option | Use |
|---|---|
| SaaS (GitHub-hosted, GitLab.com runners, CircleCI cloud) | Default for small/medium orgs |
| Self-hosted on VMs | Heavier workloads, custom hardware |
| Self-hosted on K8s | Auto-scale runner pods (actions-runner-controller, ARC) |
| Spot / preemptible runners | 50–90% cost savings on flexible workloads |
| Bare-metal for ML / GPU | Heavy compute |

**Tooling map (orchestration):**

| Tool | Strengths |
|---|---|
| **GitHub Actions** | Tight GH integration; OIDC; broad marketplace |
| **GitLab CI** | All-in-one (SCM + CI + registry); self-host friendly |
| **Jenkins** | Most plugins; legacy |
| **CircleCI / Buildkite / Drone** | SaaS-friendly |
| **Argo Workflows / Tekton** | K8s-native |
| **Argo CD / Flux** | GitOps CD |
| **Spinnaker / Harness** | Enterprise CD |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Pipeline-as-code in git | ✅ |
| PR pipeline < 10 min | ✅ |
| Cache + parallelism configured | ✅ |
| Build artifact once; promote | ✅ |
| Image signed (cosign) + SBOM attached | ✅ |
| OIDC federation for cloud auth (no static keys) | ✅ |
| All four security gates (SAST + SCA + secret + image) | ✅ |
| Auto-rollback on post-deploy alarm | ✅ |
| DORA metrics tracked | ✅ |
| Rollback path tested | ✅ |
| Flake quarantine policy | ✅ |
| Per-PR preview environments | ✅ |

**Rule of thumb:** **fail fast (cheap → expensive), build once + promote, immutable artifacts, OIDC for secrets.** Keep PR pipelines under 10 minutes; anything longer kills developer flow. **Auto-rollback on post-deploy alarms** is what makes continuous deployment safe. **DORA metrics are the scoreboard** — measure them and the rest follows.
