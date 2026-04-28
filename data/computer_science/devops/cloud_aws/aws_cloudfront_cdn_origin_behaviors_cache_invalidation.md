### AWS CloudFront (CDN, Origins, Behaviors, Cache Invalidation)

**What CloudFront is:** AWS's global CDN — 400+ edge locations cache content near viewers; origin pull on cache miss.

**Request flow:**

```
Viewer ─► nearest Edge Location
            │
   cache hit? ──► return cached
            │
   cache miss ──► Regional Edge Cache (mid-tier)
            │
   miss again ──► Origin (S3 / ALB / API GW / custom)
            ↓
   cache at edge + regional cache, then return
```

**Two-tier cache (often missed):**

| Tier | Role |
|---|---|
| **Edge Locations** | Closest to viewer; first cache check |
| **Regional Edge Caches** | Larger second-tier; absorb misses across many edges |
| **Origin** | Source of truth — only hit on miss at both tiers |

**Distribution building blocks:**

| Concept | What |
|---|---|
| **Distribution** | A CDN deployment (one set of edges + behaviors + origins) |
| **Origin** | Where to fetch on miss (S3, ALB/NLB, API Gateway, MediaPackage, custom HTTP) |
| **Origin group** | Primary + failover origin with status-code triggers |
| **Behavior** | Per-path-pattern rules (cache key, TTL, headers/cookies forwarded, edge functions) |
| **Default behavior (`*`)** | Catch-all for unmatched paths |
| **Cache policy** | Reusable rules for what makes a cache key |
| **Origin request policy** | What to forward to the origin |
| **Response headers policy** | Reusable security / CORS / custom headers |

**Behavior catalogue — pick by path pattern:**

| Path | Origin | TTL | Forward |
|---|---|---|---|
| `/static/*` (hashed assets) | S3 | 1 year | None |
| `/images/*` | S3 | 24 h | None |
| `/api/*` | ALB / API GW | 0 (pass-through) | All headers + cookies |
| `/auth/*` | ALB | 0 | All headers + cookies |
| `/feed.rss` | App | 5 min | Accept-Language |
| `/` (HTML) | App / S3 | minutes | None or Accept-Language |
| Default `*` | App | 0 (or minutes) | (depends) |

**Cache key — what makes two requests different cache entries:**

| Component | Default | Notes |
|---|---|---|
| URL path | Always part of key | — |
| Query strings | **None forwarded by default** | Forward all / specific / none — fewer = better cache hit rate |
| Headers | None | Forward only what the origin actually needs (e.g. `Accept-Language`, `CloudFront-Viewer-Country`) |
| Cookies | None | Forward only what the origin uses; auth cookies destroy caching |
| Compressed variants | Vary by `Accept-Encoding` automatically | gzip/br stored separately |
| HTTP method | GET/HEAD only by default cached | Other methods pass through |

> **Cardinality of the cache key controls hit rate.** Forward `Authorization` or a unique session cookie → every request becomes uncacheable.

**TTL knobs (response → cache):**

| Source | Effect |
|---|---|
| Origin's `Cache-Control: max-age` / `s-maxage` | Honored unless behavior overrides |
| `Cache-Control: no-store` / `private` | Edge skips caching |
| Behavior's `MinTTL` / `DefaultTTL` / `MaxTTL` | Bound origin's directive |
| `stale-while-revalidate` | Edge serves stale, refreshes async |
| `stale-if-error` | Serve stale during origin errors |

**Invalidation — clear the cache:**

| Approach | Detail |
|---|---|
| **Path-based invalidation** | `aws cloudfront create-invalidation --paths "/index.html" "/api/config"` |
| Wildcard | `--paths "/*"` (entire site) |
| Cost | First 1000 paths/month free; $0.005 per path after |
| Time | Usually < 5 min; can be ~15 min for global propagation |
| **Better — content hashing** | `app.a1b2c3.js` — deploys never collide; old hashes expire naturally |
| **Cache-Control versioning** | Bump TTL down before a critical change, restore after |

> **Invalidation is a last resort.** For build artifacts, ship hashed filenames + immutable `Cache-Control: max-age=31536000, immutable`. Save invalidation for emergencies.

**Origin types and their gotchas:**

| Origin | Watch for |
|---|---|
| **S3** (REST endpoint, not website endpoint) | Use OAC; private bucket; `index.html` requires CloudFront Function rewrite for SPA |
| **S3 website endpoint** | Public bucket; supports redirect rules; less secure, no OAC |
| **ALB / NLB** | Health checks, idle timeout, security group lets in CloudFront IP ranges (or use VPC origins) |
| **API Gateway** | Forward authorization properly; cache "0" for dynamic |
| **Custom HTTP** | Origin protocol policy; SNI; certs |
| **MediaStore / MediaPackage** | Live + VOD video specifics |

**OAC vs OAI (S3 access):**

| | **OAC (Origin Access Control)** | OAI (Origin Access Identity) — legacy |
|---|---|---|
| Recommended? | ✅ — current best practice | ❌ — legacy, still works |
| Auth method | SigV4 — full IAM-conditioned access | "Special principal" |
| KMS-encrypted S3 | ✅ supported | ❌ no |
| Cross-region buckets | ✅ | ❌ no |
| Bucket policy | `aws:SourceArn` condition for the distribution | Special CanonicalUser |

**SPA hosting on S3 + CloudFront — minimal recipe:**

| Need | Setup |
|---|---|
| Default doc resolution (`/foo` → `/foo/index.html`) | CloudFront Function on viewer-request |
| 404 → app.html (client routing) | Custom error response: 404 → `/index.html` (200) |
| Forced HTTPS | Viewer protocol policy: `redirect-to-https` |
| Cache static assets long | Behavior on `/assets/*` with `MinTTL=1y` + immutable header |
| Don't cache `index.html` | Behavior on `/index.html` with TTL=0 (so deploy lands instantly) |

**Edge compute — CloudFront Functions vs Lambda@Edge:**

| | **CloudFront Functions** | **Lambda@Edge** |
|---|---|---|
| Runtime | JavaScript (ECMAScript 5.1, sandboxed) | Node.js, Python |
| Where it runs | Edge location (closest to viewer) | Regional Edge Cache |
| Max duration | < 1 ms | 5 s (viewer) / 30 s (origin) |
| Memory | 2 MB | 128 MB+ |
| Cold start | None | Yes |
| Invocation cost | Cheap (~$0.10 / M) | More expensive |
| Triggers | viewer-request, viewer-response | viewer-request, viewer-response, origin-request, origin-response |
| Use for | URL rewrites, header normalization, A/B by header, redirects | Auth, dynamic content, fetching from another origin, complex routing |

**Edge function trigger points:**

| Trigger | Runs when |
|---|---|
| **viewer-request** | Before cache lookup — can rewrite the cache key |
| **origin-request** | On cache miss, before going to origin |
| **origin-response** | After origin replies, before caching |
| **viewer-response** | Before sending to viewer (post-cache) |

**Signed URLs vs Signed Cookies:**

| Use | Mechanism |
|---|---|
| One specific file (a single download) | Signed URL |
| Many files (e.g. an HLS playlist + segments) | Signed Cookies |
| Time-limited access | `DateLessThan` policy |
| IP-restricted | `IpAddress` condition in policy |
| Expiry | Embedded in policy; cannot be revoked early without rotating key pairs |

**HTTPS knobs:**

| Setting | Choice |
|---|---|
| Viewer protocol policy | `redirect-to-https` (default for new) |
| Origin protocol policy | `https-only` (best) or `match-viewer` |
| Cipher / TLS version (viewer side) | Security policy → `TLSv1.2_2021` (or TLSv1.3) |
| Certificate | **ACM in us-east-1** for CloudFront — has to be that region |
| Custom domains (CNAMEs) | Up to 100 per distribution; require matching cert SANs |
| HSTS | Add via Response Headers Policy |

**Performance levers:**

| Lever | Effect |
|---|---|
| Origin Shield (extra mid-tier cache for one region) | Lowers origin load; better hit rate for global apps |
| Compress objects automatically | gzip / brotli at edge for cacheable text |
| HTTP/2 + HTTP/3 (QUIC) | On by default; reduces handshake / head-of-line blocking |
| Real-time logs to Kinesis | Sub-second visibility on 4xx spikes |
| Functions to set `Cache-Control` | Override misbehaving origins |
| `stale-while-revalidate` / `stale-if-error` | Smooth latency / origin outages |

**Security headers — set via Response Headers Policy:**

| Header | Why |
|---|---|
| `Strict-Transport-Security` | Force HTTPS in browsers |
| `Content-Security-Policy` | XSS defense in depth |
| `X-Frame-Options: DENY` (or CSP `frame-ancestors`) | Anti-clickjacking |
| `Referrer-Policy: no-referrer` (or stricter) | Privacy |
| `Permissions-Policy` | Disable unused browser features |
| `X-Content-Type-Options: nosniff` | MIME sniffing protection |

**Logging / observability:**

| Source | Granularity |
|---|---|
| Standard logs to S3 | Per-request, hourly batches |
| Real-time logs to Kinesis | Sub-second |
| CloudWatch metrics | Aggregate (requests, bytes, error rates) per distribution |
| WAF logs | When CloudFront is behind AWS WAF |
| `Origin-Request-ID` / `X-Amz-Cf-Id` | Per-request trace ID for support cases |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Forwarding `Authorization` header | Cache hit rate drops to ~0 |
| Forwarding all cookies | Same — every session gets its own cache |
| Caching `Set-Cookie` responses | One user's cookie served to others |
| `MaxTTL = 0` everywhere | CDN does nothing; pure proxy + cost |
| ACM cert in wrong region | CloudFront only sees us-east-1 certs |
| Invalidating `/*` for every deploy | Cost + cache cold-start storm |
| S3 origin + index.html SPA without rewrite | `/about` returns 403 |
| Origin allowlist by IP only | CloudFront IP set is huge; use OAC or a custom header secret instead |
| Mixing path-based rules without ordering | First-match wins — order behaviors carefully |
| Forgetting to update `Vary` semantics when forwarding new headers | Wrong cache key dimensionality |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Static site / SPA | S3 + OAC + CloudFront with hashed assets |
| Dynamic API | CloudFront in front of ALB/API GW; TTL=0; forward auth |
| Mixed app | Multiple behaviors on one distribution; separate by path |
| Multi-region failover | Origin Group + health-check-driven failover |
| Regional latency anomalies | Add Origin Shield in the busiest region |
| Per-country variants | Forward `CloudFront-Viewer-Country` to cache key + edge function for redirect |
| Pre-render / SSR personalization at edge | Lambda@Edge or CloudFront Functions |

**Rule of thumb:** **CloudFront in front of everything** (static and dynamic). **Cache static assets long with content hashing**, never via invalidation. **Don't cache authenticated / personalized responses** — forward auth headers, set `MaxTTL=0`. **OAC** to lock S3 to the distribution. **CloudFront Functions for cheap header rewrites; Lambda@Edge when you need real logic.** **Hashed filenames > invalidation** — invalidation is the emergency button, not the deploy strategy.
