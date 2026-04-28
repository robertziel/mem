### Deployment Strategies — Rolling, Blue/Green, Canary, A/B, Feature Flags

**Definition:** five common ways to ship code to production with varying risk profiles. **Rolling update** is the default in Kubernetes; **blue/green** for instant rollback; **canary** for gradual exposure with metric validation; **feature flags** decouple deploy from release entirely.

**Side-by-side matrix:**

| Strategy | Downtime | Rollback speed | Cost | Complexity | Use case |
|---|---|---|---|---|---|
| **Recreate** | Yes | Slow (redeploy) | Low | Lowest | Schema-incompatible upgrades |
| **Rolling Update** | None | Slow (redeploy) | Low | Low | Default for most services |
| **Blue/Green** | None | **Instant** (switch) | High (2× infra) | Medium | Instant rollback critical |
| **Canary** | None | Fast (route away) | Low | High | Gradual rollout w/ metric gate |
| **A/B Test** | None | Per-cohort | Low | Medium | Feature experiments |
| **Feature Flag** | None | Instant (toggle) | Low | Low (per flag) | Decouple deploy + release |

**1. Recreate — old way:**

```
Phase 1:  [v1] [v1] [v1] [v1]   (running)
Phase 2:  [  ] [  ] [  ] [  ]    (stop all — DOWNTIME)
Phase 3:  [v2] [v2] [v2] [v2]    (start new)
```

| Pros | Cons |
|---|---|
| Simple | **Downtime** |
| No two versions running together | Can't progressive-rollout |
| Use when DB schema can't tolerate two app versions | Last resort |

**2. Rolling Update — gradual replacement:**

```
[v1] [v1] [v1] [v1]
[v1] [v1] [v1] [v2]
[v1] [v1] [v2] [v2]
[v1] [v2] [v2] [v2]
[v2] [v2] [v2] [v2]
```

| Pros | Cons |
|---|---|
| Zero downtime | Both versions run simultaneously |
| Default in Kubernetes Deployments | App must be backward-compatible |
| Can pause / abort mid-rollout | Slow rollback (re-deploy old version) |
| `maxSurge` + `maxUnavailable` tunable | Can be slow for large clusters |

**Kubernetes config:**

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%        # extra pods during update
    maxUnavailable: 25%  # how many can be down
```

**3. Blue/Green — two parallel environments:**

```
Phase 1:   Traffic ─►  [Blue v1]    [Green v2 idle]
Phase 2:                                  testing/warmup
Phase 3:   Traffic ─►                  [Green v2]    [Blue v1 standby]

Rollback:  Traffic ─►  [Blue v1]    [Green v2 standby]   ← instant
```

| Pros | Cons |
|---|---|
| **Instant rollback** | 2× infrastructure cost |
| Smoke-test green before cutover | DB migrations need care (shared DB) |
| Standby env for testing | Both must be schema-compatible |
| Switch via DNS / LB / service selector | Cutover is "all or nothing" — no canary |

**4. Canary — small slice, monitor, expand:**

```
T0:   95% → [v1]    5% → [v2]    (small canary)
T1:   80% → [v1]   20% → [v2]    (expand)
T2:   50% → [v1]   50% → [v2]
T3:   20% → [v1]   80% → [v2]
T4:    0% → [v1]  100% → [v2]    (cutover complete)

Abort if metrics worse:
T1:   95% → [v1]    0% → [v2]    (route away from v2)
```

| Pros | Cons |
|---|---|
| Find issues before full rollout | Most complex routing |
| Metric-driven gating | Need solid observability |
| Gradual blast-radius expansion | Two versions simultaneously (compat needed) |
| Can target by percentage / cohort | Tooling required (Flagger, Argo Rollouts) |

**Canary metric gates — common signals:**

| Signal | Threshold |
|---|---|
| HTTP 5xx rate | < +0.5% vs baseline |
| Latency p99 | < +20% vs baseline |
| Custom business metrics (conversion rate) | Within tolerance |
| Error log rate | No new top-N errors |

**5. A/B testing — feature variants by user:**

```
              ┌─ Cohort A: 50%  →  [v1 — control]
Traffic ─►───┤
              └─ Cohort B: 50%  →  [v2 — treatment]
```

| Property | Detail |
|---|---|
| Split by user attribute | Header, cookie, geo, hash(user_id) |
| About **feature comparison**, not deploy safety | Different intent than canary |
| Often paired with feature flags | Same routing layer |
| Statistical significance | Large samples needed |
| Goal: pick a winner | Then 100% to winner |

**6. Feature Flags — deploy without releasing:**

```ruby
if FeatureFlag.enabled?(:new_checkout, user: current_user)
  render NewCheckout.new
else
  render OldCheckout.new
end
```

| Property | Detail |
|---|---|
| Deploy code with feature off | Code in production but inactive |
| Toggle on per user / cohort / percentage at runtime | No deploy needed |
| Trunk-based development | Merge constantly, gate behind flag |
| Tools: LaunchDarkly, Unleash, Split, Flagsmith, env vars | Pick by scale |
| Long-lived flags become tech debt | Clean up after launch |

**Decoupling deploy from release:**

| Without flags | With flags |
|---|---|
| Deploy = release = visible to users | Deploy any time; toggle visibility separately |
| Long-lived feature branches | Short-lived branches, trunk-based |
| Feature appears all-at-once | Gradual rollout, per-cohort |
| Rollback = redeploy | Rollback = flip the flag |

**Hybrid patterns (real-world combinations):**

| Combination | Use |
|---|---|
| Canary + feature flag | Roll out infra change with canary; gate feature with flag |
| Blue/Green + feature flag | Switch envs cleanly; gradually enable feature |
| Rolling + canary tooling | Argo Rollouts canary with metric gates |
| Per-tenant rollout | Flag enabled for "internal" tenant first |
| Geographic rollout | Region by region |
| Dark launch | Run new code without showing UI to verify perf |

**Database migrations during deploy — the hard part:**

| Strategy | Detail |
|---|---|
| **Backward-compatible only** | Add nullable columns first, never drop |
| **Expand-contract pattern** | Add new schema → migrate code → remove old schema |
| Multiple deploys per logical change | Add column → backfill → switch reads → drop old |
| Coordinate with rollout | Migration must precede new code |
| `strong_migrations` (Rails) | Catches risky patterns at migration time |

**Decision tree:**

```
Schema-incompatible?
   → Recreate (with downtime), or expand-contract over multiple deploys

Need instant rollback?
   → Blue/Green

Need to gate behind metrics during rollout?
   → Canary

Need to test variants by cohort?
   → A/B + feature flag

Want to ship code without exposing it?
   → Feature Flag (always — recommend this in addition to other strategies)

Otherwise default
   → Rolling update
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Rolling update without backward-compat | Sessions break, users see errors during rollout |
| Blue/Green with shared DB schema mismatch | Old/new versions corrupt each other |
| Canary without metric gate | Just a slow rolling update |
| Long-lived feature flags | Code complexity, tech debt |
| Flag-based feature with no cleanup plan | Flags multiply unboundedly |
| Schema migration in same deploy as code change | Coupled risk |
| Big-bang deploy on Friday | Buy-in-the-weekend |
| Deploy + flag flip in same minute | Hard to attribute regressions |
| No automated rollback trigger | Manual decisions slow under stress |
| `latest` tag in container images | Can't pin / verify |

**Tooling map:**

| Need | Tool |
|---|---|
| Kubernetes rolling | Native Deployments |
| Canary on K8s | Flagger, Argo Rollouts |
| Blue/Green | Service selector swap, Spinnaker |
| Feature flags | LaunchDarkly, Unleash, Split, Flagsmith |
| GitOps deploys | Argo CD, Flux |
| Multi-stage with approvals | GitHub Actions environments, Spinnaker |
| Dark launches | App-side router |

**Cross-references:**

- CI/CD pipeline design: [cicd_pipeline_*.md](cicd_pipeline_design.md)
- Strangler fig (gradual migration): [strangler_fig_*.md](../../microservices/strangler_fig_legacy_migration.md)
- Database migration safety: [adding_indexes_*.md](../../database_engineering/adding_indexes_10m_row_large_tables_concurrent_migration.md)
- Disaster recovery: [disaster_recovery_*.md](../reliability_incident_management/disaster_recovery_dr.md)

**Rule of thumb:** **Default to rolling update + feature flags.** Reach for **blue/green** when instant rollback matters more than infra cost; **canary** when gradual exposure with metric gating is required. **Feature flags decouple deploy from release** — every feature should be flag-gated for a clean rollback path. Schema changes need their own deploy and the **expand-contract** pattern (add nullable → backfill → switch → drop). Never deploy on Friday afternoon.
