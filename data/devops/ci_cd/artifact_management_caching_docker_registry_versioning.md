### Artifact Management and Caching

**Artifact types:**
- Docker images (ECR, Docker Hub, ghcr.io)
- Build outputs (compiled binaries, bundled JS)
- Test reports, coverage reports
- Helm charts
- Terraform modules

**Build once, deploy everywhere:**
```
PR -> Build image:abc123 -> Push to registry
Staging: Deploy image:abc123
Production: Deploy image:abc123 (same image!)
```
- Never rebuild for different environments
- Environment-specific config via env vars, ConfigMaps, or secrets

**Caching strategies in CI:**

**Dependency caching:**
```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

# GitLab CI
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .pip_cache/
```

**Docker layer caching:**
```yaml
# GitHub Actions with buildx
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Parallel test splitting:**
- Split test suite across parallel jobs
- Each job runs a subset: `tests[0:N/3]`, `tests[N/3:2N/3]`, `tests[2N/3:N]`
- Merge results after all complete

**Artifact retention:**
- Set retention policies (delete after 30/90 days)
- Tag production images for long-term retention
- Use ECR lifecycle policies to auto-clean untagged images

**Versioning:**
- Git SHA for traceability: `myapp:abc1234`
- Semantic version for releases: `myapp:1.2.3`
- Avoid `latest` in production (ambiguous, not reproducible)

**Rule of thumb:** Cache dependency installs (huge time savings). Build artifacts once and promote. Tag with git SHA for traceability. Set retention policies to control storage costs.
