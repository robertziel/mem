### Staff+ Engineer: Cross-Team Influence & Technical Strategy

**What's expected at Staff+ (L6+):**
- Technical direction for a domain (not just a team)
- Influence multiple teams without managing them
- Identify problems before they're assigned to you
- Align technical work with business goals
- Multiply engineering output through standards, tools, and mentoring

**Influence without authority framework:**

**1. Build credibility first:**
- Ship high-quality work consistently
- Help other teams succeed (review their designs, debug their issues)
- Share knowledge (tech talks, RFCs, documentation)
- Be the person people come to for advice

**2. Propose with data, not opinions:**
```
BAD:  "I think we should use Kafka."
GOOD: "Our current RabbitMQ setup drops 0.3% of messages under peak load.
       Kafka's replicated log guarantees zero message loss with acks=all.
       Here's a prototype showing 10x throughput improvement.
       Migration cost: 3 engineer-weeks. ROI: eliminates the #2 incident type."
```

**3. Write RFCs (Request for Comments):**
```markdown
# RFC: Migrate to Event-Driven Architecture for Order Processing

## Problem
Order processing is synchronous, coupling 5 services.
Average latency: 2.3s. Monthly incidents from coupling: 4.

## Proposal
Introduce Kafka as event bus. Services publish/subscribe to order events.
Async processing reduces coupling and latency.

## Scope
Phase 1: Order → Payment (async) — 4 weeks
Phase 2: Order → Inventory (async) — 3 weeks
Phase 3: Order → Notification (async) — 2 weeks

## Tradeoffs
+ Decoupled services, independent deployment
+ Reduced latency (800ms → 200ms for order creation)
+ Better fault isolation
- Eventual consistency (need saga for rollback)
- Operational complexity (Kafka cluster)
- Team needs Kafka training

## Open Questions
1. Do we self-host Kafka or use MSK?
2. Schema registry: Avro or Protobuf?

## Decision deadline: [date]
```

**4. Build consensus through design reviews:**
- Present the problem before the solution
- Show alternatives with tradeoffs (not just your preferred option)
- Invite dissent ("What am I missing?")
- Document the decision (ADR)
- Follow up: "Did this work? What would we change?"

**Technical strategy document:**
- 6-12 month vision for your technical domain
- Current state → problems → target state → milestones
- Aligned with business goals ("This supports launching in EU by Q3")
- Shared with engineering leadership, reviewed quarterly

**Growing other engineers:**
| Action | Impact |
|--------|--------|
| Design review with explanations | Teach architectural thinking |
| Pair on complex problems | Transfer deep knowledge |
| Write onboarding docs | Scale your knowledge |
| Create reusable libraries/tools | Multiply team output |
| Set engineering standards with examples | Raise the bar for everyone |
| Sponsor engineers for stretch projects | Develop future leaders |

**How Staff+ is evaluated:**
- Not lines of code, but scope of influence
- Not individual features, but team/org-level improvements
- Not just shipping, but setting direction
- "What would NOT have happened without this person?"

**Rule of thumb:** Staff+ engineers are force multipliers. Lead through RFCs and data, not authority. Build credibility by helping others succeed. Write strategy documents that connect technical work to business goals. Your impact should be measurable at the team or org level, not just the feature level.
