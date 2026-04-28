### Monorepo vs Polyrepo

**Definition:** **Monorepo** keeps many projects in **one repository** (Google, Meta, Uber, Shopify); **polyrepo** keeps each project in its **own repository** (most companies). Monorepo enables atomic cross-service changes and consistent dependencies; polyrepo enables team autonomy with simpler tooling.

**Side-by-side:**

| Aspect | **Monorepo** | **Polyrepo** |
|---|---|---|
| Repo count | One | Many |
| Code sharing | Easy (same tree) | Harder (versioned packages) |
| Atomic cross-service change | One PR | Multiple PRs across repos |
| CI/CD | Complex (affected-only builds) | Simple (per-repo pipelines) |
| Dependency versions | Single (consistent) | Per-repo (can diverge) |
| Access control | Path-based (CODEOWNERS) | Per-repo permissions |
| Onboarding | Discover everything in one place | Hunt across repos |
| Scaling | Needs special tooling at scale | Git handles each fine |
| Deploy autonomy | Per-package or per-app | Per-repo natural |

**When monorepo wins:**

| Signal | Detail |
|---|---|
| Frequent cross-service changes | API contract bumps, shared libs |
| Heavy code sharing | Common types, utilities |
| Small-to-medium team (< 50 engineers) | Tooling cost manageable |
| Investment in build tooling | Nx / Turborepo / Bazel |
| Consistent tech stack | Same language(s) ideal |
| Want single source of truth | One commit history |
| Easy refactor across services | Rename across the whole tree |

**When polyrepo wins:**

| Signal | Detail |
|---|---|
| Independent teams, different cadences | Don't block each other |
| Different tech stacks per service | Different tooling needs |
| Large org (> 100 engineers) | Coordination overhead at scale |
| Open source / external contributors | Per-project access |
| Strict access control | Different permissions per repo |
| Modular architecture matters | Boundaries enforced by repo |

**Major monorepo users:**

| Company | Tooling |
|---|---|
| **Google** | Piper (custom VCS) + Bazel |
| **Meta** | Mercurial fork + Buck |
| **Microsoft** | GVFS (now Scalar) for Windows |
| **Twitter** | Pants build system |
| **Uber** | Bazel + custom |
| **Shopify** | Modular monolith approach |

**Major polyrepo users:**

| Company | Approach |
|---|---|
| Most startups | One repo per service |
| Open-source ecosystems | Per-project (npm, PyPI) |
| Spotify, Netflix (originally) | Per-team autonomy |

**Monorepo CI challenge — affected-only builds:**

```
Naive: every commit rebuilds everything → 30 min CI on big repo
Better: only rebuild what changed → "affected" detection
```

**Tools for monorepo CI:**

| Tool | Detail |
|---|---|
| **Nx** | JS/TS-focused; affected detection; remote cache |
| **Turborepo** | Lighter; content-hashed caching; remote cache (Vercel-built) |
| **Bazel** | Google-style; polyglot; deeply correct; complex |
| **Lerna** | npm package management; less used now |
| **Pants** | Twitter-built; polyglot |
| **Buck2** | Meta's modern Bazel-alternative |
| **Rush** | Microsoft's monorepo manager |

**GitHub Actions path filtering — basic monorepo CI:**

```yaml
on:
  push:
    paths:
      - 'services/api/**'
      - 'packages/shared/**'
  pull_request:
    paths:
      - 'services/api/**'
```

| Limit | Detail |
|---|---|
| Path filters detect changed dirs | Coarser than dependency-graph |
| `affected` (Nx) detects via graph | Smarter |
| Caching shared packages | Remote cache crucial |
| Required checks per service | Branch protection per path |

**Hybrid approach (most pragmatic):**

```
Monorepo for related services:
   - Frontend + BFF + shared schemas
   - All microservices for one product line

Separate repos for:
   - Independent products
   - Open-source projects
   - Different tech stacks
   - Different access control
```

**Code sharing strategies (polyrepo):**

| Strategy | Detail |
|---|---|
| **Versioned packages** | Publish to npm/PyPI/RubyGems |
| **Git submodules** | Embed repos in repos (often painful) |
| **Git subtree** | Merge histories (cleaner than submodules) |
| **Internal package registry** | Verdaccio, GitHub Packages |
| **Code generation from spec** | OpenAPI / Protobuf shared schema |

**Dependency drift in polyrepo:**

| Symptom | Detail |
|---|---|
| Service A on `lodash@4.10`, B on `4.17` | Different transitive trees |
| Coordinated upgrades hard | Each repo's own PR |
| Security patches lag | Many repos to update |
| Renovate / Dependabot | Mitigate via auto-PRs |

**Build / test scaling tactics (monorepo):**

| Tactic | Detail |
|---|---|
| Remote cache | Reuse builds across CI machines |
| Distributed builds | Bazel remote execution, Buck2 |
| Sharded tests | Parallel test runners |
| Affected-only target | Only rebuild changed graph |
| Selective deploy | Only deploy changed services |
| Branch-based testing | Deploy to ephemeral env per PR |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Monorepo without affected-only CI | 30+ min builds, dev unhappy |
| Naive sharing of dependencies | One bump breaks all services |
| Polyrepo with no shared lib | Code duplication, drift |
| Submodules / subtrees as primary share | Complex, easy to break |
| Monorepo without strict ownership (CODEOWNERS) | Anyone touches anything |
| Polyrepo without dep auto-update | Stale deps, CVEs |
| Mixing monorepo + many polyrepos | "Where does this code live?" confusion |
| Adopting Bazel without commitment | Build complexity not worth it |

**Decision matrix:**

| Need | Pick |
|---|---|
| Just starting / small team | **Polyrepo** (Git's default) |
| Frequent cross-service refactors | Monorepo |
| Tightly-coupled services + shared libs | Monorepo |
| Different deploy cadence per team | Polyrepo |
| Different tech stack per project | Polyrepo |
| Large org with strong tooling team | Monorepo can work |
| OSS-friendly | Polyrepo |
| Hybrid: bounded contexts | Mix as appropriate |

**Migration cost — converting later is hard:**

| Direction | Cost |
|---|---|
| Polyrepo → Monorepo | Medium (history merge, tooling setup) |
| Monorepo → Polyrepo | High (split history, redo CI per repo) |
| Plan for either | Avoid lock-in |

**Modular monolith — adjacent concept:**

| Property | Detail |
|---|---|
| Single deployable | Like polyrepo's simplest case |
| Strict module boundaries | Like microservices boundaries |
| Code in one repo | Like monorepo |
| Easy to extract services later | Migration path |
| Champions | Shopify, GitHub, Stack Overflow |

**Cross-references:**

- Service decomposition: [service_decomposition_*.md](../../microservices/service_decomposition_bounded_context_strangler_fig.md)
- CI/CD pipeline design: [cicd_pipeline_*.md](../ci_cd/cicd_pipeline_design.md)
- Supply chain (lock files): [supply_chain_*.md](../../web_security/supply_chain_dependency_scanning_sbom.md)

**Rule of thumb:** **Start with polyrepo (simpler).** Consider **monorepo** when cross-service changes are frequent and code sharing is heavy — and only if you're willing to invest in **affected-only CI** (Nx, Turborepo, Bazel). **Hybrid is fine**: monorepo for closely-related services, separate repos for unrelated domains. Modular monolith is often the better starting point than premature decomposition.
