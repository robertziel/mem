### Staff+ Engineer: Architecture Decisions & ADRs

**Architecture Decision Records (ADRs):**
- Lightweight documents capturing significant technical decisions
- Record: context, decision, consequences, alternatives considered
- Living documentation: team can understand WHY past decisions were made

**ADR template:**
```markdown
# ADR-001: Use PostgreSQL as primary database

## Status
Accepted (2024-01-15)

## Context
We need a primary database for our SaaS application. We expect:
- ~10M rows in the largest table within 2 years
- Complex queries with JOINs across 5-10 tables
- Strong consistency requirements for financial data
- Team has deep PostgreSQL experience

## Decision
Use PostgreSQL 16 on RDS with Multi-AZ.

## Alternatives Considered
- **MySQL**: Less feature-rich (no JSONB, worse CTE support).
  Team has less experience.
- **DynamoDB**: Excellent scale but poor for complex queries.
  Would require denormalization that adds application complexity.
- **CockroachDB**: Good for multi-region but adds operational
  complexity we don't need yet.

## Consequences
- Positive: Strong consistency, rich query capabilities, team expertise
- Positive: Ecosystem (PostGIS, pg_stat_statements, logical replication)
- Negative: Vertical scaling limits (~500 connections without PgBouncer)
- Negative: Will need sharding strategy if we exceed single-node capacity
- Risk: Must plan connection pooling early (PgBouncer)

## Follow-up
- Set up PgBouncer in transaction mode from day one
- Revisit if write throughput exceeds 10K TPS
```

**When to write an ADR:**
- Choosing a database, message queue, or major framework
- Deciding on architecture pattern (monolith vs microservices)
- Significant refactoring or migration
- Adopting a new language or tool
- Any decision that's hard to reverse

**Build vs Buy framework:**
| Factor | Build | Buy/SaaS |
|--------|-------|----------|
| Core differentiator? | Yes → build | No → buy |
| Team expertise? | Have it → build | Don't → buy |
| Time to market? | Can wait → build | Urgent → buy |
| Customization needs? | High → build | Low → buy |
| Long-term cost? | Analyze TCO | Subscription compounds |
| Vendor lock-in risk? | None | Evaluate exit strategy |

**Technical debt prioritization:**
```
Impact × Frequency = Priority

High impact, high frequency  → Fix NOW (blocks daily work)
High impact, low frequency   → Schedule this quarter
Low impact, high frequency   → Quick win, fix in sprint
Low impact, low frequency    → Document, revisit later
```

**Migration strategy decision:**
| Approach | Risk | Speed | When |
|----------|------|-------|------|
| Big bang rewrite | Very high | Fast (if it works) | Almost never |
| Strangler fig | Low | Slow but steady | Default choice |
| Parallel run | Medium | Medium | When correctness is critical |
| Feature flag migration | Low | Medium | When you can toggle per-user |

**Rule of thumb:** Write ADRs for decisions that are expensive to reverse. Include alternatives you rejected and WHY. Build core differentiators, buy commodity. Strangler fig over big-bang rewrites. Prioritize tech debt by impact × frequency. Staff+ engineers are judged on decision quality, not just technical execution.
