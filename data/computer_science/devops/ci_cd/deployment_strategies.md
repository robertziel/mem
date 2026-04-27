### Deployment Strategies

**Rolling Update:**
- Gradually replace old instances with new
- Zero downtime if configured correctly
- Default in Kubernetes Deployments
- Risk: both versions run simultaneously (must be backward compatible)
```
Old: [v1] [v1] [v1] [v1]
     [v1] [v1] [v1] [v2]
     [v1] [v1] [v2] [v2]
     [v1] [v2] [v2] [v2]
     [v2] [v2] [v2] [v2]
```

**Blue-Green:**
- Two identical environments: Blue (current) and Green (new)
- Deploy to Green, test, then switch traffic (DNS/LB)
- Instant rollback: switch back to Blue
- Downside: double infrastructure cost during deploy
```
Traffic -> [Blue v1]  |  [Green v2] (testing)
Traffic -> [Green v2] |  [Blue v1]  (standby/rollback)
```

**Canary:**
- Route small percentage of traffic to new version
- Monitor metrics (error rate, latency)
- Gradually increase traffic if healthy
- Rollback if metrics degrade
```
95% -> [v1]  |  5% -> [v2]
80% -> [v1]  |  20% -> [v2]
50% -> [v1]  |  50% -> [v2]
0%  -> [v1]  |  100% -> [v2]
```

**A/B Testing:**
- Route specific users to new version (by header, cookie, geo)
- More about feature testing than deployment
- Often combined with feature flags

**Recreate:**
- Kill all old, then start new
- Has downtime, simplest strategy
- Use when: can't run two versions (DB schema incompatible)

**Feature Flags:**
- Deploy code without activating it
- Toggle features at runtime (LaunchDarkly, Unleash, env var)
- Decouple deployment from release
- Enables trunk-based development

**Comparison:**

| Strategy | Downtime | Rollback | Cost | Complexity |
|----------|----------|----------|------|------------|
| Rolling | None | Slow (redeploy) | Low | Low |
| Blue-Green | None | Instant (switch) | High (2x) | Medium |
| Canary | None | Fast (route away) | Low | High |
| Recreate | Yes | Slow | Low | Lowest |

**Rule of thumb:** Rolling update for most cases. Canary for critical services where you need gradual rollout with metric validation. Blue-Green when you need instant rollback. Feature flags to decouple deploy from release.
