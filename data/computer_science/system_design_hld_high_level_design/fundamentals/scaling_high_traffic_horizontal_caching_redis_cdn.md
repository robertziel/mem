### Scaling for High Traffic — Horizontal, Caching, Redis, CDN

**Definition:** scaling a web app to handle 10× / 100× / 1000× traffic is **never one move** — it's a layered playbook. **Cache aggressively, statelessify the app, scale horizontally, push static to CDN, offload to background jobs**, and only then start sharding the database.

**The classic scaling order (cheapest → most expensive):**

| Step | What | Cost / risk |
|---|---|---|
| 1 | **Cache aggressively** (HTTP, fragment, low-level Redis) | Low |
| 2 | **Statelessify** the app (sessions in Redis) | Low |
| 3 | **CDN** for static assets | Low — huge win |
| 4 | **Horizontal scale** app servers behind LB | Medium |
| 5 | **Background jobs** for slow work | Low |
| 6 | **Connection pooling** (PgBouncer) | Low |
| 7 | **Read replicas** + tune indexes | Medium |
| 8 | **Partitioning** (per-tenant, by date) | High |
| 9 | **Database sharding** | Very high — last resort |

**The mental model — where time goes per request:**

```
   ┌──────────────┐
   │  Browser     │  ← cache hits short-circuit here
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  CDN edge    │  ← static + cacheable HTML hits here
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  Load balancer │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  App pod 1..N │  ← horizontal scale
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  Redis cache  │  ← short-circuits DB queries
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  PgBouncer    │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  Postgres + replicas │
   └──────────────┘
```

**Caching layers — pick the right one:**

| Layer | What it caches | TTL |
|---|---|---|
| **Browser** | Static assets (JS, CSS, images) | Long (with versioning) |
| **CDN edge** | Static + cacheable HTML | Hours to days |
| **Reverse proxy** (Varnish / NGINX) | Full HTML pages | Minutes to hours |
| **Fragment cache** (Rails) | Reusable HTML chunks | Minutes |
| **Low-level cache** (Redis) | Computed objects | Minutes to hours |
| **Memoization** (in-process) | Per-request | Request-scoped |

> **Each layer further from the request that hits cache = bigger win.** Cache at the edge first.

**Stateless app + Redis sessions:**

| Without | With |
|---|---|
| Sessions on disk (sticky LB) | Sessions in Redis (any pod handles request) |
| Pod restart loses sessions | Sessions persist |
| LB needs sticky sessions | Plain round-robin |
| Hard to autoscale | Easy autoscale |

**Horizontal scale checklist:**

| Concern | Detail |
|---|---|
| Pods behind a load balancer | Round-robin or least-conn |
| Health checks | Drain unhealthy pods |
| Autoscale on CPU / requests | HPA / ASG |
| App boot time | Should be quick (< 30s) |
| Graceful shutdown | Drain in-flight, no `kill -9` |
| Stateless code | No `@@class_var` shared state |
| Logs to stdout | Pods are ephemeral |
| Config via env vars / secrets manager | Per-pod config doesn't scale |

**CDN essentials:**

| Asset type | Cache strategy |
|---|---|
| JS / CSS bundles | Long TTL + content hash in URL |
| Images | Long TTL |
| Fonts | Long TTL + CORS |
| HTML | Short TTL or no-cache |
| API responses | Cache only if explicitly safe |
| User-specific content | Don't cache |

| Header | Effect |
|---|---|
| `Cache-Control: max-age=31536000, immutable` | Year-long, never revalidate |
| `Cache-Control: public, s-maxage=300` | Edge-only 5 min |
| `ETag` + `If-None-Match` | Conditional revalidate (304) |
| `Vary` | Per-header variant cache |

**Redis use cases (beyond cache):**

| Use | Detail |
|---|---|
| Cache | Read-through, write-through |
| Session store | Fast, shared |
| Rate limiter | Sorted sets, sliding window |
| Job queue | Sidekiq, Resque, Bull |
| Pub/sub | Light fan-out |
| Distributed lock | `SET NX EX` |
| Counters | `INCR` |
| Leaderboards | Sorted sets |
| Hot recent feed | Capped list |

**Background jobs — when:**

| Signal | Action |
|---|---|
| Request takes > 1s | Move slow part to job |
| External API call | Job |
| Email / push notification | Job |
| Image / video processing | Job |
| Report generation | Job |
| Webhook delivery | Job |

**Database scaling order:**

| Step | Detail |
|---|---|
| 1 | **Index audit** — find slow queries via `pg_stat_statements` |
| 2 | **Add indexes** — concurrent build (Postgres) |
| 3 | **Eliminate N+1** — eager loading, counter caches |
| 4 | **Connection pooling** — PgBouncer transaction mode |
| 5 | **Read replicas** — split read/write, eventual consistency |
| 6 | **Cache the DB** — Redis for hot reads |
| 7 | **Materialized views** — precompute expensive aggregates |
| 8 | **Partitioning** — by date / tenant |
| 9 | **Sharding** — last resort |

**Autoscaling triggers:**

| Metric | When to scale |
|---|---|
| Request rate (RPS) | Linear pod count to traffic |
| CPU utilization | > 70% sustained |
| Latency p99 | Saturating |
| Queue depth (jobs) | Backlog growing |
| Error rate | Doesn't trigger scaling — investigate |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Caching without invalidation strategy | Stale data |
| Caching user-specific data globally | Cross-user leak |
| Adding indexes for every slow query | Bloat + write cost |
| Read replicas + read-your-writes | Eventual consistency confuses users |
| Sharding too early | Operational nightmare |
| Vertical scale forever | Diminishing returns; expensive |
| Sticky sessions instead of stateless | Can't autoscale cleanly |
| No CDN for static | First byte time poor globally |
| One Redis for everything | Hot key issues |
| Not measuring before scaling | Wrong layer optimized |

**Measure before you scale:**

| Tool | What |
|---|---|
| APM (Datadog / New Relic / Scout) | Where time goes per request |
| `pg_stat_statements` | Slow query offenders |
| `bullet` (Rails) | N+1 detection |
| Load test (k6 / Gatling / Locust) | Find the bottleneck under load |
| Chaos engineering | What happens at edges |

**Decision matrix:**

| Pain | Fix |
|---|---|
| Slow page renders | Fragment cache |
| Slow API endpoint | Low-level Redis cache |
| Many users, small payloads | CDN |
| Sticky sessions blocking autoscale | Redis sessions |
| Database CPU at 90% | Read replica + cache |
| Burst traffic spikes | Autoscaling + queue |
| One slow query | Index, rewrite, cache |
| Multi-region latency | CDN + edge compute |

**Cross-references:**

- Caching strategies: [caching_strategies_*.md](../patterns/caching_strategies_redis_memcached_invalidation.md)
- Rate limiter: [rate_limiter_*.md](rate_limiter_redis_sorted_sets_sliding_window.md)
- CDN deep dive: [cdn_*.md](cdn_caching_origin_pop_pull_push.md)
- Read replicas + write splitting: [read_replicas_*.md](read_replicas_write_splitting_strategies.md)

**Rule of thumb:** **Scale in this order: cache → stateless → CDN → horizontal app → background jobs → connection pool → read replicas → partition → shard.** Cache at the **edge** first, the **database** last. **Measure before scaling** — APM tells you where time goes; guess wrong and you optimize the wrong layer. Never shard until everything else is exhausted — sharding is the most expensive scaling move and never reverses cleanly.
