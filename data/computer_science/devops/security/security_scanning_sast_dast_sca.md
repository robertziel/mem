### Security Scanning (SAST, DAST, SCA, IaC, Secrets, Container)

**The acronym soup — when each runs, what each finds:**

| Type | What it scans | When | Finds | Doesn't find |
|---|---|---|---|---|
| **SAST** (Static App Sec Testing) | Source code, AST | IDE / pre-commit / CI | SQLi, XSS, hardcoded secrets, insecure patterns | Runtime auth flaws, env-specific config |
| **DAST** (Dynamic App Sec Testing) | Running application | Staging / pre-prod | Auth bugs, injection, headers, exposed admin paths | Code-level issues, dead code paths |
| **IAST** (Interactive AST) | Running app **with agent inside** | Test environments | Real vuln + exact code location | Performance overhead in prod |
| **RASP** (Runtime App Self-Protection) | Running production app | Prod | Active attacks at runtime | Pre-exploitation insights |
| **SCA** (Software Composition Analysis) | Direct + transitive dependencies | CI + scheduled | Known CVEs, license violations | Bugs in your own code |
| **IaC scanning** | Terraform / CloudFormation / K8s YAML | CI | Public S3, open SGs, unencrypted DBs, drift | Runtime cloud config |
| **Container image scanning** | OS packages + libs in built image | After build, before push | Vulnerable base image, OS CVEs, exposed secrets | Runtime container behavior |
| **Secret scanning** | Git history, current diff | Pre-commit + push + scheduled | API keys, passwords, tokens | Secrets stored properly elsewhere |
| **Cloud Security Posture (CSPM)** | Live cloud config | Continuous | Drift, public buckets, IAM over-permissions | Code or runtime |
| **Cloud Workload Protection (CWPP)** | Running compute (VMs / containers) | Continuous | Active malware, anomalies | Pre-deploy issues |

**Tooling map — what to actually pick:**

| Category | OSS / cheap | Commercial |
|---|---|---|
| **SAST** | Semgrep, CodeQL (GitHub), SonarQube CE, Bandit (Py), Brakeman (Ruby), gosec, ESLint security plugins | Snyk Code, Veracode, Checkmarx, Fortify |
| **SCA** | Dependabot, Renovate, `npm audit`, `bundle audit`, `pip-audit`, OSV-scanner, Trivy | Snyk, GitHub Advanced Security, Black Duck, Sonatype |
| **DAST** | OWASP ZAP, Nuclei, Nikto, Wapiti | Burp Suite Enterprise, Tenable.WAS, Detectify |
| **IaC** | Checkov, tfsec, KICS, Trivy (config), Terrascan | Bridgecrew, Wiz, Snyk IaC |
| **Container image** | Trivy, Grype, Clair, Docker Scout | Snyk Container, Anchore, Aqua, Sysdig |
| **Secret scanning** | gitleaks, trufflehog, GitHub native, GitLab native | GitGuardian, Spectral |
| **CSPM** | Prowler, ScoutSuite, CloudSploit | Wiz, Orca, Lacework, Palo Alto Prisma |
| **CWPP** | Falco (runtime), Tracee | Aqua, Sysdig Secure, Lacework |

**Shift-left pipeline — when each scan runs:**

```
IDE              Pre-commit       CI on PR              Build              Push to registry        Pre-prod (staging)         Prod
─────            ──────────       ─────────             ─────              ─────────────────       ────────────────────       ────
SAST live        Secret scan      SAST gate             Image build        Image scan (Trivy)      DAST (ZAP / Burp)          RASP / runtime
Linter           Lint             SCA (deps)            SBOM gen           Sign (cosign)           IaC plan scan              CSPM (cloud)
                                  IaC scan                                                          Pen test                   CWPP (workload)
                                  Secret scan                                                                                  Bug bounty
```

**Pre-commit security tier — keep it fast:**

| Hook | Why |
|---|---|
| `gitleaks` / `trufflehog` | Catch secrets before they reach the remote |
| Lint + format | Style + obvious bugs |
| SAST (light, like Semgrep on changed files) | Fast on diff-only |
| `pip-audit` / `npm audit --omit=dev` | Quick dep check |

> Pre-commit must finish in **seconds**, not minutes — heavier scans belong in CI.

**CI scan tier — block PR merges:**

| Scan | Fail PR if... |
|---|---|
| Secret scan (full repo + diff) | Any secret in any file |
| SAST | High / critical findings on changed code |
| SCA | High / critical CVE in newly added dep, or in upgraded dep |
| IaC | Any failed control on changed resources |
| Image scan | High / critical OS or lib CVE in base image |
| License check | Disallowed license appears |

**SCA — what severity actually means:**

| Indicator | Meaning |
|---|---|
| **CVE ID** | The vulnerability identifier |
| **CVSS score** | 0–10 severity (base, temporal, env) |
| **EPSS** | Probability of exploitation in next 30 days |
| **KEV** (CISA Known Exploited Vulnerabilities) | "This is being exploited *right now*" |
| **Reachability** (Snyk Code, Endor Labs) | Is the vulnerable code path actually called? |
| **Fix available** | Is there a patched version? |

> **Prioritize by reachability + KEV + fix-available**, not raw CVSS. A 9.8 in unreachable code is lower priority than a 6.5 in a hot path.

**Container image scanning — what to gate on:**

| Layer | Concern |
|---|---|
| Base image | OS CVEs (libcurl, openssl, glibc) |
| Application layer | Lang-specific deps (npm, pip, gems) |
| Misconfiguration | Running as root, missing healthcheck, outdated base |
| Secrets | Tokens accidentally COPY'd into image |
| Signing | Image signed by trusted key (cosign + verification at deploy) |
| SBOM | Software Bill of Materials (SPDX / CycloneDX) shipped alongside image |

**Build-time hardening (Dockerfile checklist):**

| Check | Pass? |
|---|---|
| Pin base image by digest, not floating tag | ✅ |
| Use `-slim` / `-alpine` / **distroless** for prod | ✅ |
| `USER` set to non-root | ✅ |
| `.dockerignore` excludes `.git`, `node_modules`, secrets | ✅ |
| Multi-stage build to keep build tools out of final image | ✅ |
| `HEALTHCHECK` defined | ✅ |
| No secrets in `ENV` / `ARG` of final stage | ✅ |
| Capabilities dropped (`--cap-drop=ALL`) at runtime | ✅ |

**IaC scanning — common high-impact controls:**

| Control | Failure example |
|---|---|
| S3 bucket private | Public ACL or `Effect: Allow` to `*` principal |
| EBS / RDS / S3 encrypted | Encryption flag missing |
| Security group not `0.0.0.0/0` on management ports | Open SSH / RDP |
| RDS publicly accessible? | Should be `false` |
| VPC flow logs enabled | Audit blind spot |
| No hard-coded secrets in TF / CFN | Found by secret scan + IaC linter |
| K8s NetworkPolicy default-deny | Not present |
| K8s pod runs as non-root | Default-deny via PSA at `restricted` |

**DAST — useful in the pipeline?**

| Concern | Detail |
|---|---|
| Best run | Staging environment, after deploy |
| Time | Minutes to hours, depending on scope |
| Auth handling | DAST tool needs login flow (recorded or scripted) |
| API DAST | Feed it OpenAPI spec for full coverage |
| Continuous | Nuclei templates run nightly against staging |
| Limit | Don't run aggressive DAST against production without coordination |

**Secret scanning — three layers:**

| Layer | Catches |
|---|---|
| **Pre-commit** (`gitleaks`, `trufflehog`) | Secret never reaches the remote |
| **Push protection** (GitHub / GitLab native) | Server-side block on push |
| **Repo-history scan + revocation** | Found something already committed → revoke + rotate immediately, not just rewrite history |

> If a secret hit the remote, **assume it's compromised**. Rotate the credential; don't just `git filter-repo` and call it done.

**Vulnerability-management workflow:**

| Step | Action |
|---|---|
| 1. **Detect** | Scanner reports finding |
| 2. **Triage** | Severity × reachability × KEV/EPSS → priority |
| 3. **Assign owner** | Code owner / service team |
| 4. **Fix or accept** | Patch, mitigate, or document risk acceptance |
| 5. **Verify** | Rescan; ensure no regression |
| 6. **Track SLA** | Critical: 24 h. High: 7 d. Medium: 30 d. Low: 90 d. |
| 7. **Close** | Audit trail in ticketing system |

**Avoiding scan fatigue:**

| Tactic | Effect |
|---|---|
| **Suppress noise** with policies (e.g., test-only paths, known false positives) | Trust the remaining findings |
| **Diff-only scanning** in PRs | Reviewers see only what their PR introduced |
| **Auto-fix PRs** (Dependabot, Renovate, Snyk fix) | Merge → done |
| **Severity gates**, not "fail on anything" | Don't block on low |
| **Owners and SLAs**, not "open tickets forever" | Closes the loop |
| **Reachability-aware tools** | Filter by "can this actually run?" |

**Anti-patterns / pitfalls:**

| Pitfall | Effect |
|---|---|
| Scanning but not fixing | Reports pile up, ignored |
| One mega-scan in CI taking 30 min | Devs disable it locally |
| `npm audit fix --force` | Breaks lockfile; introduces new vulns |
| Trusting CVSS alone | Fixing 9.8s in dead code while ignoring exploited 6.5s |
| Image scan bypassed in emergency | "We'll catch it later" — lurks in prod |
| Secret rewritten from history but not rotated | Still compromised |
| DAST against prod without coordination | Triggers WAF / on-call |
| No SBOM | Can't answer "do we use log4j 2.14.x anywhere?" |
| Treating a vendor scanner as "the security program" | Scanners find known issues, not novel ones |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Secret scan in pre-commit + push protection enabled | ✅ |
| SAST + SCA in every PR pipeline | ✅ |
| IaC scan on every Terraform / CFN change | ✅ |
| Image scan + signing before pushing to registry | ✅ |
| SBOM generated and stored alongside images | ✅ |
| DAST in staging on a regular cadence | ✅ |
| CSPM enabled in production cloud | ✅ |
| Vuln SLAs defined and tracked | ✅ |
| KEV + EPSS factored into prioritization | ✅ |
| Findings have owners | ✅ |

**Rule of thumb:** **shift left** — scan as early as the change is small. **SAST + SCA + secret scan in every PR**, **image scan + signing pre-registry**, **IaC scan in CI**, **DAST in staging**, **CSPM continuously in cloud**. **Don't just scan — fix and track** with owners and SLAs. **Prioritize by reachability + KEV**, not raw CVSS. The goal is fewer findings reaching prod, not more dashboards.
