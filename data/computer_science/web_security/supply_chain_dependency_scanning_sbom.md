### Supply Chain Security & Dependency Scanning

**The supply chain risk:**
- Your app depends on hundreds of open-source packages
- Each package depends on more packages (transitive dependencies)
- One compromised package = your entire app is compromised
- Examples: event-stream (2018), ua-parser-js (2021), colors/faker (2022)

**Attack vectors:**
- **Typosquatting**: publish `lod-ash` hoping someone misspells `lodash`
- **Dependency confusion**: publish a public package with same name as internal package
- **Maintainer compromise**: attacker gains access to maintainer's npm/PyPI account
- **Malicious update**: legitimate package publishes a backdoored version

**Prevention layers:**

**1. Lock files (pin exact versions):**
```
Gemfile.lock     (Ruby)
package-lock.json / yarn.lock  (Node)
poetry.lock      (Python)
go.sum           (Go)
```
- Always commit lock files to Git
- `npm ci` (not `npm install`) in CI — installs from lock file exactly

**2. Dependency scanning in CI:**
```yaml
# GitHub Actions
- name: Audit dependencies
  run: |
    npm audit --audit-level=high
    # or: bundle audit check --update
    # or: pip-audit
    # or: snyk test
```

**Tools:**
| Tool | Languages | Type |
|------|-----------|------|
| Dependabot | All (GitHub native) | Auto-PR for updates |
| Renovate | All | Auto-PR, more configurable |
| Snyk | All | SCA + container scanning |
| npm audit | Node | Built-in vulnerability check |
| bundler-audit | Ruby | Gem vulnerability check |
| pip-audit | Python | PyPI vulnerability check |
| Trivy | All + containers | Multi-scanner |

**3. SBOM (Software Bill of Materials):**
- Machine-readable inventory of all components in your software
- Formats: SPDX, CycloneDX
- Required by US government (Executive Order 14028)
- Generate: `syft`, `trivy sbom`, `cdxgen`
- Use: know exactly what's in production, respond quickly to new CVEs

**4. Lockdown practices:**
```
# .npmrc — prevent typosquatting and confusion attacks
@mycompany:registry=https://npm.mycompany.com/
# All @mycompany packages come from internal registry
# Everything else from public npm

# Ruby Gemfile — pin sources
source "https://rubygems.org" do
  gem "rails", "~> 7.1"
end
```

**5. Automated updates (keep dependencies fresh):**
- Dependabot/Renovate: auto-create PRs for dependency updates
- Group minor/patch updates, review major updates manually
- Run full test suite on dependency update PRs
- Don't let dependencies get years behind (harder to update, more CVEs)

**Incident response for compromised package:**
1. Identify affected versions (SBOM helps)
2. Pin to safe version immediately
3. Audit for signs of exploitation
4. Update and redeploy
5. Rotate any secrets that may have been exposed

**Rule of thumb:** Commit lock files. Scan dependencies in CI. Use Dependabot/Renovate to stay current. Generate SBOMs for production. Lock internal package scopes to internal registries. Respond fast when a CVE drops — know what you're running.
