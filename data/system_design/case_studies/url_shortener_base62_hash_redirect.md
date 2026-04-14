### System Design: URL Shortener

**Requirements:**
- Functional: shorten URL, redirect short URL to original, custom aliases (optional), expiration
- Non-functional: low latency redirect (<100ms), high availability, 100M URLs/month

**Estimation:**
- Write: 100M URLs/month = ~40 URLs/sec
- Read (100:1 ratio): ~4,000 redirects/sec
- Storage: 100M * 500 bytes = ~50GB/year
- Read-heavy system

**Short URL design:**
- Base62 encoding (a-z, A-Z, 0-9): 62^7 = ~3.5 trillion combinations
- 7-character code is sufficient for most use cases
- Options: hash-based, counter-based, pre-generated

**Generation approaches:**
| Approach | How | Pros | Cons |
|----------|-----|------|------|
| Hash + truncate | MD5/SHA256(url)[0:7] | Simple, no coordination | Collisions possible |
| Counter + Base62 | Auto-increment ID -> Base62 | No collisions | Sequential (predictable) |
| Pre-generated | Batch generate random codes | No collision, no coordination | Needs key service |
| Snowflake-like | Distributed unique ID -> Base62 | No coordination | Complex |

**High-level design:**
```
Client -> LB -> API Server -> Cache (Redis)
                           -> Database (primary + replicas)

Write: POST /api/shorten {url} -> generate code -> store (code, url, created, expires) -> return short URL
Read:  GET /:code -> check cache -> check DB -> 301/302 redirect
```

**API:**
- `POST /api/shorten` - body: `{url, custom_alias?, expires_at?}` -> `{short_url}`
- `GET /:code` - 301 (permanent, cacheable) or 302 (temporary, trackable) redirect

**Data model:**
```
urls:
  id          BIGINT PRIMARY KEY
  code        VARCHAR(7) UNIQUE INDEX
  original_url TEXT
  user_id     BIGINT (optional)
  created_at  TIMESTAMP
  expires_at  TIMESTAMP (optional)
  click_count BIGINT DEFAULT 0
```

**Scaling considerations:**
- Cache hot URLs in Redis (most redirects hit a small set of popular URLs)
- Read replicas for redirect lookups
- Shard by code (hash-based) if single DB becomes bottleneck
- CDN / edge redirect for ultra-low latency
- Analytics: async click tracking via message queue (don't slow down redirect)

**301 vs 302 redirect:**
- 301 (Permanent): browser caches, fewer server hits, but you lose analytics
- 302 (Temporary): every request hits your server, better for tracking

**Rule of thumb:** This is a read-heavy system. Cache aggressively in Redis. Base62 with 7 chars gives trillions of URLs. Use 302 if you need analytics. Pre-generated keys avoid collision handling.
