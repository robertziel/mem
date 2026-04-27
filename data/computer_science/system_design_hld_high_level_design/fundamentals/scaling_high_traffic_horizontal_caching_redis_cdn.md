### Scaling for high traffic (short)

**Strategies:**
- Cache aggressively (HTTP cache, Redis).
- Keep app servers stateless and store sessions in Redis.
- Run multiple Puma workers behind a load balancer.
- Add read replicas and tune DB indexes.
- Use PgBouncer for connection pooling.
- Use background jobs for slow work.
- Use fragment and low-level caching for hot reads.
- Consider partitioning for very large write-heavy tables.
- Horizontally scale app servers.
- Autoscale when traffic is bursty.
- Use a CDN for static assets.

**Rule of thumb:** measure first, scale the bottleneck, then repeat.
