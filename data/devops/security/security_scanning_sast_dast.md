### Security Scanning (SAST, DAST, SCA)

**SAST (Static Application Security Testing):**
- Analyzes source code without running it
- Finds: SQL injection, XSS, hardcoded secrets, insecure patterns
- Run early: in IDE and CI on every PR
- Tools: Semgrep, SonarQube, CodeQL (GitHub), Bandit (Python), Brakeman (Ruby)

**DAST (Dynamic Application Security Testing):**
- Tests running application from outside (like an attacker)
- Finds: authentication flaws, injection, misconfigurations
- Run against staging/preview environments
- Tools: OWASP ZAP, Burp Suite, Nuclei

**SCA (Software Composition Analysis):**
- Scans dependencies for known vulnerabilities (CVEs)
- Checks license compliance
- Tools: Snyk, Dependabot (GitHub), Renovate, `npm audit`, `bundler-audit`

**IaC scanning:**
- Scans Terraform, CloudFormation, K8s manifests for misconfigurations
- Finds: public S3 buckets, open security groups, unencrypted databases
- Tools: Checkov, tfsec, Trivy (supports IaC), KICS

**Secret scanning:**
- Detects committed secrets (API keys, passwords, tokens)
- Tools: GitLeaks, TruffleHog, GitHub Secret Scanning
- Pre-commit hook: scan before commit reaches Git

**Shift-left security pipeline:**
```
IDE         -> Pre-commit     -> CI Pipeline     -> Staging        -> Production
(SAST,       (Secret scan,     (SAST, SCA,        (DAST,           (Runtime
 linting)     linting)          Image scan,        Pen testing)      monitoring)
                                IaC scan)
```

**CI integration example:**
```yaml
security:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    # Secret scanning
    - uses: gitleaks/gitleaks-action@v2

    # SAST
    - uses: returntocorp/semgrep-action@v1
      with:
        config: p/owasp-top-ten

    # Dependency scanning
    - run: npm audit --audit-level=high

    # IaC scanning
    - uses: bridgecrewio/checkov-action@master
      with:
        directory: terraform/

    # Container scanning
    - uses: aquasecurity/trivy-action@master
      with:
        scan-type: image
        image-ref: myapp:${{ github.sha }}
```

**Rule of thumb:** Shift left - scan as early as possible. SAST + SCA in every PR pipeline. Secret scanning as pre-commit hook. Image scanning before push to registry. DAST against staging. Don't just scan - fix and track findings.
