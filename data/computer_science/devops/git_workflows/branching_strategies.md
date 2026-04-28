### Git Branching Strategies

**The four mainstream patterns:**

| Strategy | Long-lived branches | Branch lifetime | Release cadence | Best for |
|---|---|---|---|---|
| **Trunk-based** | `main` only | < 1 day | Continuous (every commit) | Mature teams, strong CI, feature flags |
| **GitHub Flow** | `main` only | Days | Continuous (on merge) | SaaS / web apps |
| **GitLab Flow** | `main` + per-env (`production`, `staging`) | Days | Per environment | Apps with environment promotion |
| **GitFlow** | `main` + `develop` (+ `release/*`) | Weeks | Versioned releases | Mobile apps, libraries, regulated software |
| **Release Flow** (Microsoft) | `main` + `release/<version>` branches kept alive | Days–weeks | Periodic releases with hotfixes | Larger products with long support windows |

**Trunk-based — small, frequent, flagged:**

```
main: ─A─B─C─D─E─F─G─
          ^─PR─^
```

| Property | Detail |
|---|---|
| Everyone commits to `main` (or via short-lived branch < 1 day) | Avoids long-lived divergence |
| Incomplete features behind feature flags | Code on main; behavior off |
| CI / tests on every commit | Trunk must be releasable continuously |
| Required for | Continuous deployment culture |

**GitHub Flow — the SaaS default:**

```
main:    ─A───────D───────G─
feature:    └B─C─┘
hotfix:                └E─F─┘
```

| Step | Detail |
|---|---|
| 1 | Branch from `main` |
| 2 | Push, open PR |
| 3 | CI + review |
| 4 | Merge to `main` |
| 5 | Deploy from `main` |

**GitFlow — for versioned releases:**

```
main:    ─A───────────────D─────────H─
develop:    └B───C─────E─/   └F──G─/
feature:        └X─Y─/
release:                 └R1─/
hotfix:                                └P1─/
```

| Branch | Purpose |
|---|---|
| `main` | Production-ready, every commit is a release / tag |
| `develop` | Integration branch — features land here |
| `feature/*` | New work, branches from `develop` |
| `release/*` | Stabilization before merging to `main` |
| `hotfix/*` | Emergency patches branched from `main` |

> GitFlow has its place — but it's heavyweight. Most modern web apps don't need `develop` + `release/*`.

**GitLab Flow — environment branches:**

```
main      ─A─B─C─D─E─        (development)
staging      └─B─D─          (cherry-picked / merged forward)
production         └─D─E─    (merged when verified)
```

| Variant | Detail |
|---|---|
| Production branch | Merge from `main` after testing in staging |
| Pre-prod / staging branch | Tracks what's in staging |
| Per-release branches | For long-supported releases |

**Release Flow / "release branch + service-pack":**

| Concept | Detail |
|---|---|
| Cut a `release/v1.2` branch from `main` | Release becomes immutable except for hotfixes |
| Bug fixes ported back to `main` (cherry-pick or merge) | Forward-port to keep `main` clean |
| Multiple supported versions | Each gets its own `release/*` branch |

**Comparison at a glance:**

| Concern | Trunk | GitHub | GitLab | GitFlow | Release |
|---|---|---|---|---|---|
| Complexity | Lowest | Low | Medium | **High** | Medium |
| Long-lived branches | 1 | 1 | 1 + env | 2+ | 1 + per-version |
| Release model | Continuous | On merge | Promote envs | Cut release branch | Branch-per-version |
| Suits monorepo? | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Feature flags required? | Heavily | Optional | Optional | Optional | Optional |
| Hotfix path | Same as feature | Branch from main | Branch from prod | `hotfix/*` | Cherry-pick to release branch |

**Branch naming conventions:**

| Pattern | Example |
|---|---|
| `feature/<slug>` | `feature/add-login` |
| `feat/<ticket>-<slug>` | `feat/JIRA-123-login` |
| `fix/<slug>` | `fix/payment-timeout` |
| `hotfix/<slug>` | `hotfix/critical-auth-bug` |
| `chore/<slug>` | `chore/update-deps` |
| `docs/<slug>` | `docs/api-readme` |
| `refactor/<slug>` | `refactor/extract-payment-service` |
| `release/<version>` | `release/v1.2.0` |
| `hotfix/<version>-<slug>` | `hotfix/v1.2.1-csrf` |

**Conventional commits — pair with conventional branches:**

| Type | Use |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Tooling, deps |
| `docs:` | Docs only |
| `test:` | Tests only |
| `refactor:` | No behavior change |
| `perf:` | Performance |
| `build:` / `ci:` | Build / pipeline |
| `revert:` | Revert a previous commit |
| `BREAKING CHANGE:` (in body / footer) | Major bump |

> **Conventional Commits + Semantic Release** auto-generate changelogs and version bumps.

**Merge strategies — pick the right shape per repo:**

| Strategy | Result | Pros | Cons |
|---|---|---|---|
| **Merge commit** (`--no-ff`) | Preserves the branch as a sub-graph | Audit-friendly; clear "this PR landed" point | History fan-out can look noisy |
| **Squash merge** | All branch commits collapsed to one on `main` | Clean linear `main`; one logical unit per PR | Loses intermediate history |
| **Rebase + fast-forward** | Branch commits replayed on top of `main` | Linear history; preserves individual commits | Rewrites SHAs; risky if branch was shared |
| **Rebase + merge commit** | Replay then merge with `--no-ff` | Linear within branch + landing point | Hybrid quirks |

**When to pick which merge:**

| Project shape | Recommended |
|---|---|
| SaaS / monorepo with PR-per-feature | **Squash merge** (one PR = one commit on main) |
| OSS / library where individual commits matter | Merge commit or rebase + ff |
| Mature trunk-based with disciplined commits | Rebase + ff |
| Long-lived release branches needing audit | Merge commits |

**Rebase rules — when it's safe:**

| Rule | Detail |
|---|---|
| Don't rebase **shared branches** | Once others have it, rebasing rewrites their history |
| Personal feature branches: rebase freely | Keep up with `main` cleanly |
| Use `--force-with-lease` over `--force` | Refuses if remote moved without you knowing |
| Interactive rebase (`-i`) for cleanup | Squash, fixup, reword before merge |
| Public history of `main` | **Never rebase** |

**PR (pull request) discipline:**

| Practice | Why |
|---|---|
| Small, focused (< 400 lines diff) | Reviews are real; not "looks ok" |
| Descriptive title + body | Future you reading `git log` |
| Linked issue / ticket | Traceability |
| Required reviewers (1–2) | Code-owner approval enforced via `CODEOWNERS` |
| CI green before merge | Branch-protection rule |
| No direct push to `main` | Branch-protection rule |
| Auto-delete merged branches | Keeps repo clean |
| Stack PRs when multiple steps depend on each other | Easier review than one mega-PR |
| Draft PRs early for discussion | Visibility before perfection |

**CODEOWNERS pattern:**

```
# .github/CODEOWNERS
*                      @org/platform
/web/                  @org/frontend
/payment/              @org/payments
*.tf                   @org/sre
*.sql                  @org/db-team
```

| Effect | Detail |
|---|---|
| Auto-requests review from listed owners | On every PR touching the path |
| Required-reviewer enforcement | Pair with branch protection |

**Branch protection — recommended settings on `main`:**

| Setting | Value |
|---|---|
| Require pull request | ✅ |
| Required approvals | 1–2 |
| Dismiss stale approvals on new commits | ✅ |
| Require status checks (CI) | ✅ |
| Require conversation resolution | ✅ |
| Require signed commits | ✅ (production / regulated) |
| Require linear history | ✅ if you squash-merge |
| Disallow force pushes | ✅ |
| Disallow deletions | ✅ |
| Bypass list | Empty (no admin overrides) |

**Hotfix flow (regardless of base strategy):**

| Step | Detail |
|---|---|
| 1 | Branch from `main` (or release branch) |
| 2 | Minimal change + targeted test |
| 3 | PR with elevated review urgency |
| 4 | Tag + deploy |
| 5 | Forward-port to `develop` / future release branches |
| 6 | Post-mortem if customer-affecting |

**Long-running feature techniques (avoid stale branches):**

| Technique | Detail |
|---|---|
| **Feature flags** | Merge incomplete code, hide behind flag |
| **Branch by abstraction** | Refactor in place behind an interface; switch implementations |
| **Trunk + dark launch** | Code live, traffic excluded |
| **Regular rebase** on `main` | Daily; don't let conflicts accumulate |
| **Stack of small PRs** (Graphite / Stacked Diffs) | Merge piece-by-piece |
| **Submodules / vendoring for cross-team work** | Decouples release cadence |

**Monorepo vs polyrepo branching:**

| Concern | Monorepo | Polyrepo |
|---|---|---|
| Branching strategy | Trunk-based or GitHub Flow + path-scoped CI | Per-repo flexibility |
| Merge strategy | Squash usually best | Per-repo team preference |
| Release | Per-package versioning (Changesets, Lerna, Nx) | Per-repo |
| Code ownership | `CODEOWNERS` per path | Per-repo permissions |

**Tags and releases:**

| Tag style | Use |
|---|---|
| `v1.2.3` | Semantic version |
| `release-2024-04-15` | Date-based |
| `prod-2024-04-15.1` | Date + ordinal for multi-deploy days |
| Annotated tags (`git tag -a -s`) | Signed, with message — better for releases |
| Lightweight tags | Quick markers |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Long-lived feature branches | Merge hell, integration debt |
| `git push --force` on shared branch | Rewrites others' history |
| No branch protection on `main` | Direct pushes, broken main |
| Merging without CI green | Broken main; rolling back is more work |
| Mixing strategies (rebase + merge inconsistently) | Confusing history |
| `git pull` (default merge) into a branch you'll rebase | Creates merge commits you don't want |
| Squashing on a shared release branch | Loses commit attribution |
| Cherry-picking a chain across many branches | Conflicts diverge silently |
| `develop` + `main` for a small SaaS team | Overhead; switch to GitHub Flow |
| Using GitFlow for continuous deployment | Inevitable mismatch |

**Workflow choice — a decision matrix:**

| Question | If yes → |
|---|---|
| Continuous deployment, mature CI | Trunk-based |
| Web app / SaaS, deploy on merge | GitHub Flow |
| Need staged promotion across environments | GitLab Flow |
| Versioned product with parallel supported releases | Release Flow / GitFlow |
| Mobile app with App-Store release cycles | GitFlow or Release Flow |
| Library with semver releases | Release branch + semver tags |
| OSS project with many maintainers | GitHub Flow + CODEOWNERS |

**Rule of thumb:** **default to GitHub Flow or trunk-based for web services**; reach for **GitFlow only when you actually have versioned releases**. **Short-lived feature branches** (< a few days), **squash-merge for clean `main`**, **branch protection + required CI + CODEOWNERS**. **Feature flags** beat long-lived branches every time. **Conventional Commits** make changelogs and semver-bumps automatic.
