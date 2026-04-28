### Supply Chain Security — Dependency Scanning, SBOM, Lock Files

**Definition:** modern apps depend on hundreds of open-source packages, each pulling in transitive dependencies. **One compromised package = full app compromise.** Defense: pin via **lock files**, scan via **CI**, generate an **SBOM** for what's in production, monitor with **Dependabot / Renovate**, and respond fast when CVEs drop.

**The supply-chain risk surface:**

| Vector | Detail |
|---|---|
| **Typosquatting** | `lod-ash` vs `lodash` — install grabs malicious copy |
| **Dependency confusion** | Public package with same name as internal one — wins on resolution |
| **Maintainer compromise** | npm / PyPI account hijack → backdoored release |
| **Malicious update** | Legitimate package, malicious new version |
| **Subdomain takeover** | Package homepage redirects to attacker |
| **Compromised CI infrastructure** | Build artifacts swapped |
| **Untrusted post-install scripts** | Malicious code at install time |

**Real-world incidents (study these):**

| Year | Package | What happened |
|---|---|---|
| 2018 | `event-stream` | Maintainer added attacker as collaborator; backdoor injected |
| 2021 | `ua-parser-js` | Maintainer's npm account compromised; malware in updates |
| 2022 | `colors`, `faker` | Author intentionally broke the packages |
| 2024 | `xz-utils` | Multi-year social-engineering supply chain attack |
| 2025+ | Frequent | LLM-suggested phantom packages registered by attackers |

**The five defense layers:**

| Layer | Purpose | Tool |
|---|---|---|
| **Lock files** | Pin exact versions | `package-lock.json`, `Gemfile.lock`, `poetry.lock` |
| **Dependency scanning** | Catch known CVEs in CI | `npm audit`, `bundle audit`, Snyk, Trivy |
| **SBOM** | Inventory of what's in production | `syft`, `cdxgen`, Trivy |
| **Auto-update** | Stay current with patches | Dependabot, Renovate |
| **Internal registry / scope locking** | Block dependency-confusion | `.npmrc` scope binding |

**1. Lock files — pin exact versions:**

| Ecosystem | Lock file | Install command (CI-safe) |
|---|---|---|
| Node | `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` | `npm ci` (not `npm install`) |
| Ruby | `Gemfile.lock` | `bundle install --frozen` |
| Python | `poetry.lock` / `Pipfile.lock` / `requirements.txt` (with hashes) | `pip install --require-hashes` |
| Go | `go.sum` | `go build` (verifies hashes) |
| Rust | `Cargo.lock` | `cargo build --locked` |
| Java | (`pom.xml` is config; lock via `dependencyManagement`) | Maven enforcer |

> Always commit lock files. CI must use the strict install command (won't update versions).

**2. Dependency scanning in CI:**

```yaml
# GitHub Actions example
- name: Audit dependencies
  run: |
    npm audit --audit-level=high          # Node
    bundle exec bundle-audit check --update   # Ruby
    pip-audit                                # Python
    govulncheck ./...                         # Go
    cargo audit                               # Rust
```

**Tools comparison:**

| Tool | Scope | Format |
|---|---|---|
| **Dependabot** | All major ecosystems | GitHub-native, auto-PRs |
| **Renovate** | All major + custom | More configurable than Dependabot |
| **Snyk** | All + containers + IaC | Commercial; deep scan |
| **Trivy** | Containers + dependencies + IaC | Free, fast |
| **OWASP Dependency-Check** | Java + others | OSS, slower |
| **`npm audit`** | Node | Built into npm |
| **`bundler-audit`** | Ruby | Gem CVEs |
| **`pip-audit`** | Python | Built by PyPA |
| **`govulncheck`** | Go | Official |
| **GitHub Advanced Security** | All on GitHub | Native, paid |

**3. SBOM — Software Bill of Materials:**

| Property | Detail |
|---|---|
| Machine-readable inventory of all components | OSS libs, transitive deps, OS packages |
| Formats | **SPDX**, **CycloneDX** (most common) |
| Required by US Executive Order 14028 | For federal contracts |
| Required by EU Cyber Resilience Act | Coming into force |
| Tools to generate | `syft`, `trivy sbom`, `cdxgen`, GitHub native |
| Use case | When CVE drops — "is this in my fleet?" answer fast |

**SBOM workflow:**

```
1. Build artifact / image
2. Generate SBOM (syft myimage:tag -o spdx-json > sbom.json)
3. Sign the SBOM (cosign attest)
4. Store with the artifact (registry / S3)
5. On CVE: query SBOMs to find affected services
```

**4. Lockdown — registry and scope:**

```ini
# .npmrc — internal scope from internal registry
@mycompany:registry=https://npm.mycompany.com/
//npm.mycompany.com/:_authToken=<token>
```

```ruby
# Gemfile — pin sources
source "https://rubygems.org" do
  gem "rails", "~> 7.1"
end

source "https://gems.mycompany.com" do
  gem "internal_lib"
end
```

| Defense | Detail |
|---|---|
| Internal scope from internal registry | Stops dependency confusion |
| Block direct public access for internal packages | Internal-only naming |
| Use `--frozen-lockfile` / `npm ci` | No silent upgrades |
| Sign packages (Sigstore, npm attestations) | Verify provenance |

**5. Stay current — Dependabot / Renovate config:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      patches:
        update-types: ["patch"]
      minors:
        update-types: ["minor"]
    open-pull-requests-limit: 10
```

| Strategy | Detail |
|---|---|
| Group patch + minor | Reduce PR churn |
| Review major manually | Breaking change risk |
| Run full test suite on dep PR | Catch regressions |
| Don't let deps go years stale | Harder to migrate, more CVEs |
| Pin transitive via overrides if needed | `npm overrides` / `yarn resolutions` |

**Container image hygiene:**

| Practice | Detail |
|---|---|
| Use minimal base images | `distroless`, `alpine`, slim |
| Pin to digest (not just tag) | `image@sha256:...` |
| Scan with Trivy / Snyk in CI | Block on critical |
| Keep base images updated | Periodic rebuild |
| Multi-stage builds | Don't ship build tools |
| No secrets in image | Even `.env` files |
| Sign with Cosign | Verifiable provenance |

**Build-system security:**

| Practice | Detail |
|---|---|
| Build in clean ephemeral containers | No leftover state |
| Verify build provenance (SLSA) | Reproducible builds |
| Sign artifacts (Sigstore / Cosign) | Provenance attestation |
| OIDC for cloud auth (no long-lived keys) | OIDC tokens per build |
| Restrict who can publish | Two-person review |
| Use `--integrity` / hashes for fetched assets | npm, pip, etc. |

**Incident response when a CVE drops:**

| Step | Action |
|---|---|
| 1. **Identify** | Use SBOM to query: who's running affected versions? |
| 2. **Pin** | Update lock file to safe version; emergency PR |
| 3. **Audit** | Logs / metrics for signs of exploitation |
| 4. **Update + redeploy** | Across all affected services |
| 5. **Rotate** | Any secrets that may have been exposed |
| 6. **Post-mortem** | What was our detection lag? |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Lock files not committed | Each install resolves differently |
| `npm install` instead of `npm ci` in CI | Silent version drift |
| No CVE scanning in CI | Vulnerabilities reach prod |
| Ignoring transitive deps | Direct deps look fine; transitives compromised |
| No SBOM | "Are we affected?" is a multi-day investigation |
| Updating only directs | Transitive ones rot |
| `latest` tag for containers | Image silently changes |
| Same npm scope for internal + external | Confusion attack vector |
| Self-hosted internal registry without auth | Anyone publishes |
| Not testing dep updates | Breakage at runtime |

**Cross-references:**

- SAST / DAST / SCA: [sast_dast_sca_*.md](sast_dast_sca_application_security_testing.md)
- Container security: [container_security_*.md](container_security_image_runtime_kubernetes.md)
- CI/CD security: [cicd_pipeline_*.md](../devops/ci_cd/cicd_pipeline_design.md)
- Secrets management: [secrets_management_*.md](secrets_management_vault_kms_rotation.md)

**Rule of thumb:** **Commit lock files; scan dependencies in CI; generate SBOM in production builds; auto-update with Dependabot/Renovate; lock internal scopes to internal registries.** Treat the supply chain as code you own — **respond fast when CVEs drop**, and know what you're running before the question is asked. Every transitive dep is your dep.
