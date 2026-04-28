### System Design: URL Shortener (TinyURL / Bit.ly)

**Definition:** **read-heavy** redirect service — input a long URL, return a short code; later, hit the short URL and 30x-redirect to the original. Key choices: **code generation** (hash, counter, pre-generated), **storage** (KV / RDBMS), **caching** (Redis), and **redirect type** (301 vs 302).

**Requirements:**

| Type | Detail |
|---|---|
| **Functional** | Shorten URL; redirect short → original; custom alias (optional); expiration (optional); analytics (optional) |
| **Non-functional** | Low-latency redirect (< 100ms p99); high availability (99.99%); 100M URLs / month |
| **Implicit** | Short codes are forever (or for the URL's lifetime); abuse-resistant |

**Capacity estimation:**

| Number | Calculation |
|---|---|
| Writes | 100M / month = ~40 / sec |
| Reads (100:1 ratio) | ~4,000 / sec |
| Storage (500B / URL) | 50 GB / year |
| Bandwidth (read-heavy) | Light — redirects are tiny |
| Cache hit rate | 80%+ feasible (Pareto distribution) |

**Short-code design:**

| Property | Detail |
|---|---|
| **Base62** alphabet (`a-z A-Z 0-9`) | URL-safe, no escape needed |
| 7 chars → 62⁷ ≈ **3.5 trillion** combinations | Plenty |
| 6 chars → 56 billion | Often enough |
| Avoid confusable chars (0/O, 1/l) | Optional — Crockford Base32 |
| Length matters for shareability | 7 chars is the sweet spot |

**Code generation — four approaches:**

| Approach | How | Pros | Cons |
|---|---|---|---|
| **Hash + truncate** | Take MD5/SHA256(url)[0:7] | Stateless, no coordination | **Collisions** likely (need retry) |
| **Counter + Base62** | Auto-increment ID → Base62 encode | No collisions | Sequential = guessable + predictable |
| **Pre-generated pool** | Batch-generate random codes; pick from pool | No collisions, no coordination | Needs key service |
| **Snowflake-like** | Distributed unique 64-bit ID → Base62 | No coordination, time-ordered | More complex |
| **Hybrid** | Counter+random suffix | Decent uniqueness, smooth | Some collision risk |

**Architecture:**

```
   Client
     │  POST /shorten {url}
     ▼
   Load Balancer
     │
     ▼
   API Server  ──► Redis (cache)  ──── ► return short_url
     │            (cache miss)
     ▼
   Database (primary + N read replicas)
     │
     ▼
   Code generator (counter / Snowflake / pool)
```

```
   Client
     │  GET /:code
     ▼
   Load Balancer
     │
     ▼
   API Server  ──► Redis (cache)  ──── ► 301/302 redirect
     │            (cache miss)
     ▼
   Database (read replicas)
```

**API:**

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /api/shorten` | Create | `{url, custom_alias?, expires_at?}` → `{short_url}` |
| `GET /:code` | Redirect | 301 (perm) or 302 (temp) to original |
| `GET /api/info/:code` | Metadata | Click counts, created_at, expiration |
| `DELETE /api/:code` | Revoke | Idempotent |

**Data model:**

```sql
CREATE TABLE urls (
  id           BIGSERIAL PRIMARY KEY,
  code         VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id      BIGINT,                   -- optional: track creator
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ,              -- optional
  click_count  BIGINT DEFAULT 0          -- often denormalized for speed
);
CREATE UNIQUE INDEX idx_urls_code ON urls(code);
```

| Field | Notes |
|---|---|
| `code` | Indexed unique — primary lookup key |
| `original_url` | TEXT — URLs can be long |
| `expires_at` | NULL = never |
| `click_count` | Denormalized counter (or in Redis) |

**Cache strategy:**

| Property | Detail |
|---|---|
| Cache key | `url:<code>` |
| Cache value | The original URL (or full row JSON) |
| TTL | 1h–24h depending on volume |
| Hit rate | 80%+ achievable due to power-law access |
| Negative caching | Cache "code not found" for short TTL |
| Invalidation | On URL update / delete |

**301 vs 302 redirect — important choice:**

| Redirect | Browser behavior | Trade-off |
|---|---|---|
| **301 Permanent** | Aggressively cached by browsers/proxies | Fewer server hits; **lose analytics** after first hit |
| **302 Found / Temporary** | Not cached by default | Every request reaches you; **better analytics** |
| **307 / 308** | Method-preserving variants | Rarely needed for GET shorteners |

> **Use 302 if you need click analytics. Use 301 if you don't.**

**Click analytics — async tracking:**

```
GET /:code
   │
   ├─ lookup code → original URL
   ├─ enqueue click event {code, ts, ip, ua, referrer}  ← async
   ├─ 302 redirect
   ▼
   (User browser navigates)

   Worker drains queue → aggregates → Postgres / ClickHouse
```

| Property | Detail |
|---|---|
| Don't block redirect on logging | Async via Kafka / Redis Streams |
| Aggregate at write time | Counters, not raw events |
| Roll up daily / hourly | Materialized views |
| Capture: IP, UA, referrer, geo | Privacy-aware |

**Custom aliases:**

| Concern | Detail |
|---|---|
| Reserved keywords | Block: `/api`, `/admin`, etc. |
| Profanity / abuse filter | At creation time |
| Trademark / dispute process | Manual review |
| Per-user namespace | Or first-come-first-served |
| Length limits | Min 4, max 30 typical |

**Scaling considerations:**

| Concern | Mitigation |
|---|---|
| Read scaling | Cache + read replicas |
| Write scaling | Sharding by `code` (hash-based) |
| Hot URLs | CDN / edge redirect |
| Database growth | Archive old / unused codes; partition by created_at |
| Multi-region | Replicate read-only globally; writes go to one region |
| Abuse / spam | Rate limit creation, scan for malicious URLs |
| Code generation contention | Pre-gen pool, or counter w/ batches |

**Counter approach — batched range allocation:**

```
Service A reserves IDs 1000-1999 from coordinator
   → No coordination per shorten until exhausted
   → On exhaustion, reserves next range

Coordinator: simple atomic counter (Redis INCRBY 1000)
```

| Win | Detail |
|---|---|
| Reduces coordinator pressure | 1000× fewer coordinator calls |
| Service still gets unique IDs | Within its range |
| Range size tunable | Higher = less coordination, more wasted IDs on crash |

**Snowflake ID format (alternative):**

```
| timestamp (41 bits) | machine_id (10 bits) | sequence (12 bits) |
        ↓                       ↓                      ↓
   millisecond                this server          per-ms counter
```

| Property | Detail |
|---|---|
| 64-bit ID, time-ordered | Sortable |
| No coordination | Each machine generates locally |
| Survives clock skew (with care) | NTP-synced |
| Convert to Base62 for URL | ~11 chars |

**Security considerations:**

| Concern | Mitigation |
|---|---|
| Open redirect to malicious sites | Domain allowlist or scan |
| Phishing | Manual review for risky domains |
| URL hijacking | Auth on creation/edit |
| Enumeration via sequential IDs | Use random/hash-based codes |
| DDoS on `POST /shorten` | Rate limit per IP / user |
| Spam / SEO link farms | Rate limit + abuse detection |
| Expired URL re-use | Don't recycle codes |

**Decision matrix — code generation pick:**

| Need | Pick |
|---|---|
| Cannot tolerate any collision | Counter + Base62 OR pre-gen pool |
| Want sharding-friendly | Hash-based |
| Want time-ordered | Snowflake |
| Don't want predictable codes | Pre-gen / hash |
| Custom aliases | Application logic + uniqueness constraint |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Sync click logging | Adds latency to redirect |
| MD5 hash without collision retry | Same URL → same code (intentional?) — collisions on different URLs |
| Code = sequential counter | Trivially enumerable / scrapable |
| 301 + analytics expectation | After first hit, browser caches — no more analytics |
| No cache | Every redirect hits DB |
| Single Redis without HA | Cache miss = DB stampede |
| Allowing `/admin`, `/api` codes | Routing conflicts |
| No rate limit on POST | Easy abuse |
| Allowing redirect to file:// or javascript: | Open-redirect vector |

**Cross-references:**

- Caching strategies: [caching_strategies_*.md](../patterns/caching_strategies_redis_memcached_invalidation.md)
- Database scaling (sharding, read replicas): [database_scaling_*.md](../fundamentals/database_scaling_sharding_replication_read_replicas.md)
- Rate limiting: [rate_limiter_*.md](../fundamentals/rate_limiter_redis_sorted_sets_sliding_window.md)
- Snowflake ID generation: [unique_id_generation_*.md](../fundamentals/unique_id_generation_snowflake_uuid_lexicographic.md)

**Rule of thumb:** **Read-heavy: cache aggressively in Redis, read replicas for misses.** Use **Base62 with 7 chars** for trillions of unique short codes. Pick **pre-gen pool or counter+Base62** if you can't tolerate collisions; **Snowflake** if you want distributed coordination-free generation. **302 if you need click analytics**, 301 otherwise. Always **async-log clicks** so the redirect path stays fast.
