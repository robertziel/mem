### Scaling for high traffic (short)

**Strategies:**
- Cache aggressively (HTTP cache, Redis).
- Add read replicas and tune DB indexes.
- Use background jobs for slow work.
- Horizontally scale app servers.
- Use a CDN for static assets.

**Rule of thumb:** measure first, scale the bottleneck, then repeat.
