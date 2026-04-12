### CI/CD Pipeline Design

**CI (Continuous Integration):**
- Developers merge to shared branch frequently
- Every merge triggers automated build + test
- Goal: catch issues early, keep main branch deployable

**CD (Continuous Delivery vs Continuous Deployment):**
- **Continuous Delivery** - every change is deployable, but deploy is manual approval
- **Continuous Deployment** - every change that passes pipeline is auto-deployed to production

**Standard pipeline stages:**
```
Commit -> Build -> Test -> Scan -> Deploy Staging -> Integration Test -> Deploy Prod
```

1. **Build** - compile, bundle, create Docker image
2. **Unit tests** - fast, isolated tests
3. **Lint / Static analysis** - code quality, formatting
4. **Security scan** - SAST, dependency vulnerabilities, container scan
5. **Integration tests** - test with real dependencies
6. **Deploy to staging** - validate in production-like environment
7. **E2E / Smoke tests** - critical user flows
8. **Deploy to production** - with rollback strategy
9. **Post-deploy verification** - health checks, smoke tests, monitoring

**Pipeline best practices:**
- Fail fast: run quick checks (lint, unit tests) before slow ones
- Parallelize independent stages
- Cache dependencies (node_modules, pip, Docker layers)
- Artifact once, deploy many: build image once, promote through environments
- Immutable artifacts: same image in staging and production
- Pin versions of tools and base images
- Keep pipeline under 10 minutes for PR feedback

**Environment promotion:**
```
Build -> Dev (auto) -> Staging (auto) -> Production (manual gate / auto)
```

**Trunk-based CI vs branch-based CI:**
- Trunk-based: short-lived branches, merge to main frequently, feature flags
- Branch-based: long-lived feature branches, merge via PR (risk of drift)

**Rule of thumb:** Build once, deploy everywhere. Fail fast. Keep pipelines under 10 minutes. Use immutable artifacts. Automate everything except production approval (if needed).
