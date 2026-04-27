### Monorepo vs Polyrepo

**Monorepo:**
- All projects/services in one repository
- Examples: Google, Meta, Uber
- Tools: Nx, Turborepo, Bazel, Lerna

**Polyrepo:**
- Each project/service in its own repository
- Most common in industry
- Standard Git/GitHub workflow

**Comparison:**

| Aspect | Monorepo | Polyrepo |
|--------|----------|----------|
| Code sharing | Easy (same repo) | Harder (packages, versioning) |
| Atomic changes | Cross-service changes in one PR | Multiple PRs across repos |
| CI/CD | Complex (affected-only builds) | Simple (per-repo pipelines) |
| Dependencies | Single version (consistent) | Per-repo (can diverge) |
| Access control | Harder (CODEOWNERS, paths) | Easy (per-repo permissions) |
| Scaling | Needs special tooling at scale | Git handles well per repo |
| Onboarding | Discover everything in one place | Need to find relevant repos |

**When monorepo works well:**
- Tightly coupled services that change together
- Shared libraries used across services
- Small-to-medium team (< 50 engineers)
- Strong tooling investment (affected-only CI, code owners)

**When polyrepo works well:**
- Independent teams with different deploy cadences
- Different tech stacks per service
- Large organization (> 100 engineers)
- Open source projects
- Strict access control requirements

**Monorepo CI challenge:**
- Don't rebuild everything on every commit
- Detect affected projects: `nx affected --target=build`
- Turborepo: content-addressed caching, remote cache
- Path-based triggers in GitHub Actions:
```yaml
on:
  push:
    paths:
      - 'services/api/**'
      - 'packages/shared/**'
```

**Hybrid approach:**
- Monorepo for related services (e.g., frontend + BFF)
- Separate repos for unrelated domains
- Shared libraries as versioned packages (npm, gems, PyPI)

**Rule of thumb:** Start with polyrepo (simpler). Consider monorepo when cross-service changes are frequent and code sharing is valuable. Monorepo requires investment in tooling (Nx, Turborepo) to work well.
