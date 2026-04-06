### Rate limiter with Redis sorted sets

A common design uses a sliding window per key, where the key might be an IP address, API key, or user plus endpoint.

### Basic flow

- Add the current timestamp to a sorted set
- Remove entries older than the window
- Count remaining entries
- Reject with `429` when the count is over the limit
- Set a TTL so old keys expire automatically

### Why Redis works well

- Shared state across many app servers
- Fast writes and reads
- Sorted sets fit time-window queries well

### Rails angle

- Rack middleware is good for infrastructure-level limits
- Controller or service-level checks are good for business-specific limits

**Rule of thumb:** Key the limit by the actor plus the action, and keep the limiter in shared infrastructure like Redis.
