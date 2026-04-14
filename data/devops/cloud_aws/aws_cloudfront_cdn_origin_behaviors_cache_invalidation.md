### AWS CloudFront (CDN)

**What CloudFront does:**
- Global CDN with 400+ edge locations
- Cache content close to users (low latency)
- Origins: S3, ALB, API Gateway, custom HTTP server

**Architecture:**
```
User → Nearest Edge Location → Cache hit? → Return cached
                              → Cache miss? → Fetch from origin → Cache → Return
```

**Distribution configuration:**
- **Origins**: where CloudFront fetches content (S3, ALB, custom)
- **Behaviors**: rules per URL path pattern (cache settings, headers to forward)
- **Default behavior**: catch-all for unmatched paths

**Cache behaviors by path:**
```
/static/*   → Origin: S3 bucket     → Cache TTL: 1 year (immutable hashed assets)
/api/*      → Origin: ALB           → Cache TTL: 0 (no caching, pass-through)
/images/*   → Origin: S3 bucket     → Cache TTL: 24 hours
Default (*) → Origin: ALB           → Cache TTL: 0
```

**OAC (Origin Access Control) for S3:**
- Restrict S3 access to CloudFront only (no direct S3 URL access)
- S3 bucket policy allows only CloudFront's OAC principal
- Replaces legacy OAI (Origin Access Identity)

**Cache key controls:**
```
What makes two requests "different" (separate cache entries):
  - URL path (always)
  - Query strings: none / all / specific keys
  - Headers: none / specific (Accept-Language, Authorization)
  - Cookies: none / all / specific

More forwarded = less caching = more origin hits
```

**Cache invalidation:**
```bash
# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/index.html" "/api/config"

# Wildcard
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/*"
```
- First 1000 invalidation paths/month free, then $0.005/path
- Better practice: use content hashing (`app.a1b2c3.js`) instead of invalidation

**Lambda@Edge / CloudFront Functions:**
| Feature | CloudFront Functions | Lambda@Edge |
|---------|---------------------|-------------|
| Runtime | JavaScript only | Node.js, Python |
| Execution | Edge location | Regional edge cache |
| Max duration | 1 ms | 5-30 seconds |
| Use for | URL rewrites, header manipulation, redirects | Auth, A/B testing, dynamic content |

**Signed URLs / Signed Cookies (private content):**
- Restrict access to paid content, time-limited downloads
- Signed URL: for individual files
- Signed Cookies: for multiple files (e.g., streaming playlist)

**HTTPS:**
- Viewer ↔ CloudFront: always HTTPS (redirect HTTP)
- CloudFront ↔ Origin: HTTPS or HTTP (match-viewer or HTTPS-only)
- Certificate: ACM (must be in us-east-1 for CloudFront)

**Rule of thumb:** CloudFront in front of everything (static + dynamic). Cache static assets aggressively with content hashing. Don't cache authenticated/personalized responses. Use OAC to lock down S3. CloudFront Functions for simple header rewrites, Lambda@Edge for complex logic. Invalidation is a last resort — prefer hashed filenames.
