### CDN (Content Delivery Network)

**What a CDN does:**
- Caches content at edge locations close to users
- Reduces latency (content served from nearest POP)
- Offloads origin server traffic
- DDoS protection (absorbs traffic at the edge)

**What to put behind a CDN:**
- Static assets (JS, CSS, images, fonts, videos)
- API responses that are cacheable (public, GET, with proper Cache-Control)
- Entire static sites (S3 + CloudFront)

**Cache-Control headers:**
- `Cache-Control: public, max-age=31536000` - cache for 1 year (hashed assets)
- `Cache-Control: no-cache` - revalidate with origin every time
- `Cache-Control: no-store` - never cache (sensitive data)
- `Cache-Control: private` - only browser cache, not CDN
- `s-maxage` - CDN-specific max age (overrides max-age for CDN)

**Cache invalidation:**
- **Filename hashing** - `app.a1b2c3.js` (best practice, instant "invalidation" via new URL)
- **Purge/invalidation API** - explicitly remove cached objects
- **TTL expiry** - wait for cache to expire naturally
- **Versioned paths** - `/v2/api/data`

**CloudFront specifics:**
- **Origin** - where CloudFront fetches content (S3, ALB, custom HTTP)
- **Behavior** - rules per path pattern (cache settings, headers to forward)
- **OAC/OAI** - restrict S3 access to only CloudFront
- **Lambda@Edge / CloudFront Functions** - run code at edge (redirects, auth, A/B testing)
- **Price classes** - limit edge locations to reduce cost

**Common patterns:**
- S3 + CloudFront for static hosting
- ALB + CloudFront for dynamic content with edge caching
- Signed URLs/cookies for private content

**Rule of thumb:** Cache static assets aggressively with content hashing. Never cache authenticated/personalized responses at the CDN. Use `s-maxage` to control CDN caching independently of browser caching.
