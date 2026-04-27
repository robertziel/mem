### System Design Interview Framework

**Step 1: Requirements clarification (3-5 min)**
- Functional requirements: what should the system do?
- Non-functional requirements: scale, latency, availability, consistency
- Ask: DAU, read/write ratio, data size, geographic distribution
- Clarify scope: what's in and out of this design?

**Step 2: Back-of-envelope estimation (3-5 min)**
- Users, requests/sec, storage, bandwidth
- Identify bottleneck: read-heavy? write-heavy? storage-heavy?
- Example: 100M DAU, 10 requests/day = ~12K QPS, peak ~24K QPS

**Step 3: High-level design (10-15 min)**
- Draw the major components (clients, LB, app servers, DB, cache, queues)
- Define APIs (endpoints, request/response)
- Identify data model (entities, relationships, access patterns)
- Choose database type (SQL vs NoSQL) with reasoning

**Step 4: Deep dive (10-15 min)**
- Interviewer picks areas to drill into
- Discuss tradeoffs, not just solutions
- Address bottlenecks and single points of failure
- Add: caching, sharding, replication, CDN, message queues

**Step 5: Wrap-up (3-5 min)**
- Summarize tradeoffs made
- Discuss monitoring, alerting, operational concerns
- Mention future improvements (what you'd add with more time)

**Estimation cheat sheet:**
- 1 day = 86,400 sec (~100K for easy math)
- 1 million requests/day = ~12 QPS
- 1 billion requests/day = ~12,000 QPS
- 1 char = 1 byte, 1 int = 4 bytes, 1 long = 8 bytes
- 1 KB = 1,000 bytes, 1 MB = 10^6, 1 GB = 10^9, 1 TB = 10^12
- Read from memory: ~100 ns, SSD: ~100 μs, HDD: ~10 ms, network round trip: ~1-100 ms

**Rule of thumb:** Always start with requirements and estimation. Design is about tradeoffs, not perfect answers. State your assumptions explicitly. Drive the conversation, don't wait for prompts.
