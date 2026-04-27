### Git Branching Strategies

**Trunk-Based Development:**
- Everyone commits to `main` (trunk) directly or via short-lived branches (<1 day)
- Feature flags hide incomplete work
- CI runs on every commit to main
- Best for: mature teams, strong CI, continuous deployment
```
main: --A--B--C--D--E--F--
       ^short branch^
```

**GitHub Flow:**
- One long-lived branch: `main`
- Feature branches from `main`, merge via PR
- Deploy from `main` after merge
- Simple, works well for web apps with continuous deployment
```
main:    --A------D------G--
feature:    \-B-C-/
hotfix:              \-E-F-/
```

**GitFlow:**
- Long-lived branches: `main` (releases) + `develop` (integration)
- Feature branches from `develop`
- Release branches for stabilization
- Hotfix branches from `main`
- Best for: versioned releases, mobile apps
```
main:     --A-----------D----
develop:    \-B---C----/
feature:       \-X-Y-/
release:          \-R-/
```

**Comparison:**

| Strategy | Complexity | Best for | Release model |
|----------|-----------|----------|---------------|
| Trunk-based | Low | Continuous deployment | Every commit |
| GitHub Flow | Low | Web apps, SaaS | Merge to main |
| GitFlow | High | Versioned software, mobile | Release branches |

**Branch naming conventions:**
- `feature/add-login` or `feat/JIRA-123-login`
- `fix/payment-timeout`
- `chore/update-deps`
- `hotfix/critical-auth-bug`

**PR best practices:**
- Small, focused PRs (< 400 lines)
- Descriptive title and description
- Required reviews (1-2 approvals)
- CI must pass before merge
- Squash merge for clean history, or merge commit for preserving context

**Merge vs Rebase vs Squash:**
- **Merge commit** - preserves full branch history (good for audit)
- **Squash merge** - all commits become one (clean main history)
- **Rebase** - replay commits on top of target (linear history, rewrites SHAs)

**Rule of thumb:** Default to GitHub Flow or trunk-based for web services. Use GitFlow only if you need versioned releases. Keep feature branches short-lived. Squash merge for clean main history.
