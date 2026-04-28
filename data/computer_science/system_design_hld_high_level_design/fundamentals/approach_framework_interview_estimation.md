### System Design Interview — Approach, Framework, Estimation

**Total time budget (45–60 min interview):**

| Step | Time | Goal |
|---|---|---|
| 1. Requirements clarification | 5 min | Functional + non-functional + scope |
| 2. Back-of-envelope estimation | 5 min | QPS, storage, bandwidth |
| 3. High-level design | 10–15 min | Components + APIs + data model |
| 4. Deep dive | 15–20 min | Tradeoffs, bottlenecks, drill-downs |
| 5. Wrap-up | 3–5 min | Tradeoffs summary, monitoring, what you'd add |

**Step 1: Requirements clarification — questions to ask:**

| Functional | Non-functional |
|---|---|
| What does the user do? Core flows? | Scale: DAU, peak QPS, total users |
| Read or write heavy? | Latency target: p50 / p95 / p99 |
| What's in scope vs out? | Availability: 99.9% / 99.99% |
| Data model: who owns what? | Consistency: strong vs eventual? |
| Multi-tenant? | Geographic distribution |
| Real-time vs batch? | Storage size + retention |
| API or UI? | Compliance: PCI / HIPAA / GDPR |

**Step 2: Back-of-envelope estimation — the numbers to know:**

| Quantity | Round number |
|---|---|
| Seconds in a day | 86,400 ≈ **100,000** for easy math |
| 1 M req/day | ~ **12 QPS** average; ~ **24 QPS peak** (2× factor) |
| 1 B req/day | ~ **12K QPS** average; ~ **24K QPS peak** |
| 100M DAU × 10 actions/day | 1B req/day → ~ 12K QPS avg / 24K peak |
| Peak factor | **2× to 3×** average for typical traffic |

**Latency / throughput orders of magnitude (Jeff Dean numbers):**

| Operation | Typical |
|---|---|
| L1 cache reference | ~1 ns |
| L2 cache reference | ~4 ns |
| Branch misprediction | ~5 ns |
| Mutex lock/unlock | ~25 ns |
| Main memory reference | ~100 ns |
| Compress 1 KB | ~3 μs |
| Read 1 MB sequentially from memory | ~250 μs |
| **SSD random read** | ~100 μs |
| Read 1 MB sequentially from SSD | ~1 ms |
| Round-trip in same datacenter | ~500 μs |
| Round-trip cross-region (US → EU) | ~100–150 ms |
| Round-trip cross-continent | ~150–300 ms |
| **HDD seek** | ~10 ms |
| Read 1 MB sequentially from HDD | ~30 ms |
| TCP packet from CA → Netherlands | ~150 ms |
| Container start | ~1 s |
| VM boot | ~30 s |

**Storage / data sizes:**

| Quantity | Bytes |
|---|---|
| 1 char (ASCII) | 1 byte |
| 1 int (32-bit) | 4 bytes |
| 1 long (64-bit) | 8 bytes |
| 1 UUID | 16 bytes binary, 36 chars string |
| 1 typical row in app DB | 100–500 bytes |
| 1 KB | 10³ bytes |
| 1 MB | 10⁶ bytes |
| 1 GB | 10⁹ bytes |
| 1 TB | 10¹² bytes |
| 1 PB | 10¹⁵ bytes |

**Estimation worked example — Twitter-like timeline:**

| Step | Calculation |
|---|---|
| Users (MAU) | 100M |
| Active per day (DAU) | 50M |
| Tweets per user per day | 2 (avg, write-light) |
| Tweets per day | 100M tweets |
| Tweets per second (peak ~3×) | ~3,500 tweets/s |
| Reads per user per day | 100 timeline reads |
| Reads per day | 5B |
| Reads per second (peak ~3×) | ~150K reads/s |
| Tweet size | 280 chars + metadata = ~1 KB |
| Daily tweet storage | 100 GB/day |
| 5-year storage | ~180 TB (without media) |

> Numbers don't have to be exact. Show you can **estimate quickly** and **identify the bottleneck** — usually reads.

**Step 3: High-level design — components to consider:**

| Layer | Components |
|---|---|
| Edge | DNS, CDN, WAF |
| Entry | Load balancer (L4 / L7), API gateway |
| App | Stateless app servers behind LB |
| Cache | Redis / Memcached (session + hot data) |
| Database | SQL / NoSQL by access pattern |
| Object store | S3 / GCS / blob for media + logs |
| Search | Elasticsearch / OpenSearch |
| Async | Kafka / SQS / RabbitMQ + workers |
| Background | Batch jobs (Spark / Airflow / cron) |
| Notifications | Push / email / SMS service |
| Observability | Metrics + logs + traces (Prometheus / Loki / Tempo or Datadog) |

**Step 3b: API design — define the surface:**

| Concern | Detail |
|---|---|
| Endpoints | `POST /tweets`, `GET /timeline?user_id=...`, etc. |
| Request / response shape | Field names, types |
| Auth | OAuth / JWT / Bearer |
| Rate limiting | Per user / per IP |
| Pagination | Cursor preferred over offset |
| Idempotency | Required for mutations |
| Error envelope | Stable shape |

**Step 3c: Data model — choose by access pattern:**

| Need | Pick |
|---|---|
| Strong consistency, complex queries | PostgreSQL / MySQL |
| High write throughput, flexible schema | Cassandra / DynamoDB |
| Hot reads + cache | Redis |
| Time-series at scale | TimescaleDB / InfluxDB / ClickHouse |
| Full-text search | Elasticsearch |
| Graph relationships | Neo4j / DGraph |
| Object storage | S3 / GCS |
| Document store | MongoDB |
| Wide-column for analytics | BigQuery / Snowflake / Redshift |

**Step 4: Deep dive — what interviewers probe:**

| Topic | Probable ask |
|---|---|
| Bottleneck identification | "What's your biggest bottleneck?" |
| Scaling reads | Caching, read replicas, CDN |
| Scaling writes | Partitioning, sharding, batching, async |
| Data model | "Why this choice over X?" |
| Caching strategy | Cache-aside vs write-through; TTL vs invalidation |
| Queue choice | Kafka vs SQS — ordering vs throughput |
| Consistency | Strong vs eventual — when each is OK |
| Failover | What happens if X fails? |
| Hot keys / partitions | How to detect + mitigate |
| Multi-region | Active-active vs active-passive; replication lag |
| Geo / edge | CDN, geo-routing, regional shards |
| Observability | Metrics, logs, traces, alerts |
| Security | Auth, encryption, rate limiting, abuse prevention |
| Cost | Per-million-requests order of magnitude |

**Common patterns to mention:**

| Pattern | Use |
|---|---|
| **Cache-aside** | Read from cache, fall back to DB, populate cache |
| **Read replicas** | Scale reads horizontally |
| **Sharding** | Partition by user/tenant/key |
| **Consistent hashing** | Add nodes without remapping all keys |
| **CDN at edge** | Static + cacheable dynamic |
| **Async via queue** | Decouple producer from consumer |
| **Outbox pattern** | Atomic event publishing |
| **CQRS** | Separate read/write models |
| **Event sourcing** | Append-only event log (rare; only when needed) |
| **Bulkhead / circuit breaker** | Isolate failure domains |
| **Idempotency keys** | Safe retries |
| **Rate limiting** (token bucket) | Throttle abusers |
| **Backpressure** | Queue depth signals upstream to slow down |
| **Fan-out (push vs pull)** | News feed / notifications choice |
| **Chunked / multipart upload** | Large files |

**Step 5: Wrap-up — what to cover:**

| Topic | Detail |
|---|---|
| Tradeoffs you made | Be explicit |
| Monitoring + alerting | RED metrics, SLOs, on-call |
| What you'd add with more time | Multi-region, more features, optimization |
| Operational concerns | Deploys, DR, security |
| Cost considerations | Order-of-magnitude estimate |

**Communication tactics during the interview:**

| Tactic | Detail |
|---|---|
| **Drive the conversation** | Don't wait for prompts |
| **Think out loud** | Show reasoning |
| **State assumptions explicitly** | "Assuming 50M DAU, 10 reads / write per user..." |
| **Use the whiteboard / drawing tool** | Visual > verbal for system design |
| **Manage time** | Don't get stuck in one component |
| **Acknowledge tradeoffs** | "X is faster but Y is simpler — I'd pick X because..." |
| **Ask if interviewer wants to drill in** | "Want me to deep-dive on caching here?" |
| **Quantify decisions** | "10K QPS — Postgres can handle this with one primary + replicas" |
| **Mention what you'd test** | Load test, chaos engineering |
| **End cleanly** | Summary of what you built |

**Common mistakes:**

| Mistake | Effect |
|---|---|
| No clarifying questions | Build the wrong system |
| Skipping estimation | Sized wrong |
| Jumping to implementation details | Lose forest for trees |
| Single point of failure | Always identify + mitigate |
| Treating like coding interview | Different skill — show breadth |
| Buzzword soup | Show understanding, not vocabulary |
| Designing for 100× expected load | Over-engineering |
| Ignoring cost | Real systems have budgets |
| No monitoring story | "How will you know it's broken?" |
| Not adapting to interviewer cues | If they push back, listen |
| Refusing to commit to a choice | Make a call; defend it |

**A library of mental models to invoke:**

| Model | When |
|---|---|
| **CAP / PACELC** | Multi-region, consistency conversations |
| **Little's Law** (`L = λW`) | Throughput / latency / concurrency |
| **Read vs write skew** | Anywhere there's load |
| **Hot key / hot partition** | Sharding discussions |
| **Backpressure / queue depth** | Async systems |
| **80/20 cache hit rate** | Caching ROI |
| **Two generals problem** | Distributed coordination |
| **Eight fallacies of distributed computing** | Reliability conversations |

**What "good" looks like:**

| Signal | Detail |
|---|---|
| Drives the conversation | Doesn't wait for prompts |
| Asks great clarifying questions | Up front |
| Estimates with the right precision | Order of magnitude |
| Picks one component at a time to deepen | Doesn't get scattered |
| Shows multiple approaches with tradeoffs | "Option A: …, Option B: …" |
| Thinks about failure modes | Without prompting |
| Acknowledges what they don't know | Doesn't bluff |
| Wraps up with summary + future work | Closes the loop |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Memorized template applied to every problem | Interviewers see through it |
| Reciting "use Kafka" without justifying | Shallow |
| Fragile assumptions | Brittle design |
| Not asking about scale | Wrong sizing |
| Single-author hero design | Real systems need many people |

**Cheat-sheet table for common interview questions:**

| Question | Key concepts |
|---|---|
| URL shortener | Hash-based ID, base62, cache, write-once-read-many |
| Twitter / news feed | Fan-out push vs pull, hybrid |
| Chat / WhatsApp | WebSocket, presence, message store, fan-out |
| Uber / ride-share | Geo-index (S2/H3/geohash), matching, real-time location |
| Payment system | Idempotency, saga, double-entry, audit |
| Search autocomplete | Trie, top-K per prefix, real-time vs batch |
| Video streaming | Encoding ladder, ABR, CDN, manifest |
| Distributed file storage | Chunking, replication, dedup, lifecycle |
| Recommendation system | Candidate generation + ranking, embeddings, A/B |
| Notification system | Channel routing, queue per channel, idempotency |
| Rate limiter | Token bucket, leaky bucket, sliding window |
| Distributed cache | Consistent hashing, replication, eviction |

**Cross-references:**

Specific case-study cheatsheets:

- [news_feed_*.md](../case_studies/news_feed_timeline_fan_out_push_pull_ranking.md)
- [chat_system_*.md](../case_studies/chat_system_websocket_messaging_presence.md)
- [ride_sharing_*.md](../case_studies/ride_sharing_uber_geospatial_matching.md)
- [search_autocomplete_*.md](../case_studies/search_autocomplete_trie_typeahead_prefix.md)
- [video_streaming_*.md](../case_studies/video_streaming_youtube_netflix_transcoding.md)
- [proximity_service_*.md](../case_studies/proximity_service_yelp_google_maps_geohash.md)
- [web_crawler_*.md](../case_studies/web_crawler_search_engine.md)
- [notification_system_*.md](../case_studies/notification_system_push_email_sms_delivery.md)
- [ecommerce_*.md](../case_studies/ecommerce_inventory_checkout_cart.md)
- [distributed_cache_*.md](distributed_cache_consistent_hashing_redis_cluster.md)

**Rule of thumb:** **always start with requirements + estimation** — design follows from there. **State assumptions explicitly. Drive the conversation. Show tradeoffs, not perfect answers.** Pick **one bottleneck at a time** and drill — interviewers care more about depth on the right thing than breadth on everything. **End with a summary** of tradeoffs + future work.
