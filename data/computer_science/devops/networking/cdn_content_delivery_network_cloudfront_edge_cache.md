### CDN — Content Delivery Network (CloudFront, Edge Caching)

**Cross-ref:** for AWS CloudFront-specific configuration see [aws_cloudfront_*.md](../cloud_aws/aws_cloudfront_cdn_origin_behaviors_cache_invalidation.md). This file is the **CDN concepts** view, vendor-neutral.

**What a CDN does:**

| Function | Detail |
|---|---|
| Cache content at edges close to users | Lower latency, fewer round-trips |
| Offload origin server | Most reads served from cache |
| **DDoS absorption** | Edge handles flood traffic |
| TLS termination at edge | TLS handshake near user |
| Compression / image optimization | Smaller payloads |
| Edge compute (functions / workers) | Logic without origin trip |
| Geo / failover routing | Steer users to healthy POPs |

**What to put behind a CDN:**

| Asset type | Cache verdict |
|---|---|
| Static (JS / CSS / images / fonts / video) | ✅ Aggressive cache |
| Hashed assets (`app.a1b2c3.js`) | ✅ Cache 1 year + immutable |
| Public API responses (GET, no auth) | ✅ With short TTL |
| Authenticated / personalized responses | ❌ Don't cache at the CDN |
| HTML pages of static sites | ✅ Short TTL |
| API responses with `Cache-Control: private` | ❌ Browser only |
| Real-time / streaming | Specialized CDN (live streaming) |

**`Cache-Control` directives — pick deliberately:**

| Directive | Effect |
|---|---|
| `public` | Any cache (browser + CDN) |
| `private` | Browser cache only — CDN must skip |
| `no-cache` | Cache, but revalidate before serving |
| `no-store` | Never cache (sensitive responses) |
| `max-age=<s>` | TTL for browsers + CDN |
| `s-maxage=<s>` | TTL **for shared caches (CDN)** — overrides `max-age` for CDN |
| `must-revalidate` | Once stale, must check before serving |
| `stale-while-revalidate=<s>` | Serve stale up to N seconds while refreshing async |
| `stale-if-error=<s>` | Serve stale during origin errors |
| `immutable` | Browser doesn't even revalidate; perfect for hashed assets |

**Recommended `Cache-Control` patterns:**

| Asset | Header |
|---|---|
| Hashed JS / CSS / image | `Cache-Control: public, max-age=31536000, immutable` |
| Versioned API response | `Cache-Control: public, max-age=60, stale-while-revalidate=60` |
| HTML index | `Cache-Control: no-cache` (revalidate) or `max-age=60` |
| Authenticated response | `Cache-Control: private, no-store` |
| Sensitive (financial) | `Cache-Control: no-store, no-cache, must-revalidate` |
| API with ETag | `Cache-Control: public, max-age=0, must-revalidate` (always 304/200 via revalidation) |

**Cache key — what makes two requests "different":**

| Component | Default in cache key |
|---|---|
| URL path | Always |
| Query string | Sometimes (depends on CDN config; allow-list better than all) |
| Headers | None unless forwarded explicitly |
| Cookies | None unless forwarded |
| `Vary: <header>` | Splits cache by that request header |

> **Forward as little as possible** in the cache key. Forwarding `Authorization` ⇒ cache hit rate near 0.

**`Vary` — varying responses by request header:**

| `Vary` header | Behavior |
|---|---|
| `Vary: Accept-Encoding` | Separate cache for `gzip` / `br` / identity (auto in most CDNs) |
| `Vary: Accept-Language` | Per-language cache |
| `Vary: Cookie` | Per-cookie cache (often cardinality explosion) |
| `Vary: User-Agent` | Per-UA (almost never wanted at CDN) |

**Cache invalidation strategies — pick one:**

| Strategy | Detail |
|---|---|
| **Filename hashing** (`app.a1b2c3.js`) | **Best** — content change = new URL; old cached URL irrelevant |
| **Versioned paths** (`/v2/api/data`) | Same idea, coarser |
| **Purge / invalidation API** | Explicitly remove from edge — slow + costs money |
| **Wildcard purge** (`/*`) | Last resort; cache cold start |
| **TTL expiry** | Wait — only viable for low-volume / non-urgent change |
| **Soft purge / stale-while-revalidate** | Mark stale; refresh in background |

> Treat **invalidation as the emergency button**, not the deploy strategy. Hash filenames so deploys never need invalidation.

**Origin protection patterns:**

| Pattern | Detail |
|---|---|
| **Origin shield** (mid-tier cache) | One regional cache absorbs many edge misses; better hit rate at origin |
| **Origin failover** (origin group) | Primary + backup with health-based switch |
| **WAF in front of origin** | Block bad traffic; rate-limit |
| **Restrict origin access** to CDN only | OAC (CloudFront), origin shield headers, IP allow-list |
| **Pre-warming** | Push hot content to edges before launch |
| **Tiered caching** (Fastly / Cloudflare) | Multiple cache levels |

**TLS at the CDN:**

| Knob | Detail |
|---|---|
| Viewer protocol | `redirect-to-https` (default for new); enforce HTTPS |
| Origin protocol | `https-only` (best) or `match-viewer` |
| TLS version (viewer) | `TLSv1.2_2021` or `TLSv1.3_2024` |
| Cert | Provider-managed (ACM / Cloudflare Universal SSL) or BYO |
| SNI | Required by all modern CDNs |
| HSTS | Set on responses; pre-load eligible |

**Edge compute:**

| Tool | Detail |
|---|---|
| **Cloudflare Workers** | V8 isolates; sub-ms cold start; KV + Durable Objects |
| **AWS Lambda@Edge** | Node.js / Python; viewer-request, origin-request, origin-response, viewer-response |
| **AWS CloudFront Functions** | JS-only; ~1 ms; URL rewrite, header normalization |
| **Fastly Compute@Edge** | WebAssembly |
| **Vercel Edge Functions** | V8 isolates over Cloudflare/AWS |
| **Akamai EdgeWorkers** | JS at edge |
| Use cases | A/B testing, auth, geo redirect, request normalization, response transformation, dynamic content assembly |

**Performance levers — what each achieves:**

| Lever | Effect |
|---|---|
| Brotli / gzip compression at edge | Smaller wire payloads |
| Image optimization (resize, AVIF, WebP) | Smaller images, modern format |
| HTTP/2 + HTTP/3 (QUIC) | Less head-of-line blocking |
| Early hints (HTTP `103`) | Browser starts prefetching |
| Prefetch / prerender directives | Speed up next navigation |
| Real-time logs to streaming destination | Sub-second visibility |
| Origin shield / tiered caching | Reduce origin load |
| Per-edge keep-alive to origin | Faster cache misses |

**Common CDN providers — strengths:**

| Provider | Notable for |
|---|---|
| **AWS CloudFront** | AWS integration, OAC, Lambda@Edge, Functions |
| **Cloudflare** | Free tier; broad security suite (WAF, DDoS, Bot, Workers); Anycast |
| **Fastly** | Programmable edge (VCL → Compute@Edge); fast purge |
| **Akamai** | Largest network; enterprise; legacy |
| **Google Cloud CDN** | GCP-integrated; HTTPS LB-backed |
| **Azure Front Door / CDN** | Azure-integrated |
| **Bunny.net** | Cheap; fast |
| **KeyCDN / Stackpath / G-Core** | Mid-tier |

**Security at the CDN:**

| Concern | Capability |
|---|---|
| **DDoS** | Anycast network absorbs floods at edge |
| **WAF** | Rule sets (OWASP top 10, custom) |
| **Bot management** | Distinguish bots from humans |
| **Rate limiting** | Per-IP, per-path |
| **Hotlinking protection** | Referrer / token-based access |
| **Signed URLs / cookies** | Time-limited / IP-limited access |
| **Geo blocking** | Country allow/deny lists |
| **Origin shielding** | Origin only accepts traffic from CDN |

**Real-time logs / analytics:**

| Source | Detail |
|---|---|
| Standard logs (S3 / GCS) | Hourly batches |
| Real-time logs (Kinesis / Pub/Sub) | Sub-second |
| Per-request `X-Cache: HIT/MISS/STALE` header | Debug-friendly |
| `X-Amz-Cf-Id` / `cf-ray` | Per-request trace ID |
| Edge / origin error rates | Surface in dashboards |
| Cache hit ratio | Most important CDN metric |

**Health metrics — the four to watch:**

| Metric | Healthy |
|---|---|
| **Cache hit ratio** | > 80% (varies by content type) |
| Edge → origin latency | Bounded |
| Origin error rate (5xx) | Near zero |
| Edge bandwidth | Within budget |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Forwarding `Authorization` to origin in cache key | Hit rate ~0 |
| Forwarding all cookies | Same |
| Caching `Set-Cookie` responses | Cookies leak across users |
| Mutable tags + long TTL | Stale forever |
| Invalidating on every deploy | Cold-start storm |
| `s-maxage` not set, only `max-age` | Both browser and CDN cache same TTL — surprise stale |
| HTTPS misconfigured (no HSTS, weak ciphers) | TLS audit fails |
| Origin without protection (any IP) | Bypass CDN security |
| Caching personalized responses | Privacy leak |
| `Vary: User-Agent` | Cardinality explosion |
| Long TTL on dynamic API endpoints | Stale data, surprise behavior |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| AWS-native, simple integration | CloudFront |
| Free tier + broad security suite | Cloudflare |
| Programmable edge (custom logic) | Fastly / Cloudflare Workers |
| Streaming / live video | Specialized CDN (Akamai, Edgecast, MUX) |
| Multi-cloud / multi-CDN | Use a CDN load balancer (Cedexis / NS1) |
| Static site only | Most CDNs work; pick by cost/UX |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Hashed asset filenames + `immutable` | ✅ |
| HTTPS only (HSTS preload) | ✅ |
| HTTP/2 + HTTP/3 enabled | ✅ |
| Origin protected (OAC / IP allow-list / signing header) | ✅ |
| `Cache-Control` set explicitly per route | ✅ |
| Authenticated responses NEVER cached | ✅ |
| Brotli / gzip compression | ✅ |
| `Vary` only includes necessary headers | ✅ |
| Real-time logs / cache-hit-ratio dashboard | ✅ |
| Origin shield enabled (or equivalent tiered cache) | ✅ |
| WAF + rate limit | ✅ |
| Cert auto-renewed | ✅ |

**Rule of thumb:** **CDN in front of everything**, even dynamic content. **Hash filenames + `immutable`** for static assets — invalidation becomes a non-event. **Don't cache anything personalized** (forward auth headers, set `private` / `no-store`). **`s-maxage`** controls CDN cache; `max-age` controls browser cache — set both deliberately. **Origin shield** + **WAF** + **HTTPS-only** is the production baseline.
