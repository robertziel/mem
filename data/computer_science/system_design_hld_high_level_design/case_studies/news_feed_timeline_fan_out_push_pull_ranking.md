### System Design: News Feed / Timeline (Fan-out, Push vs Pull, Ranking)

**Scope:** user posts → followers see it in their feed. Reverse-chronological or ranked. Some users have millions of followers, most have hundreds.

**The core question — when to materialize the feed:**

| Strategy | Materialize when | Read | Write |
|---|---|---|---|
| **Fan-out on write** (push) | At publish time, pre-compute every follower's feed | **Cheap** — fetch pre-built list | **Expensive** — write × follower count |
| **Fan-out on read** (pull) | At read time, query followees and merge | **Expensive** — query N timelines + merge | **Cheap** — append to author's own timeline |
| **Hybrid** (push + pull) | Push for normal users; pull for celebrities | Cheap (cache) + small merge | Cheap for celebs; per-follower for normals |

**Push vs pull tradeoffs:**

| Concern | Push (fan-out on write) | Pull (fan-out on read) |
|---|---|---|
| Read latency | Lowest — single fetch | High — N queries + merge + sort |
| Write amplification | High — `1 post × F followers` writes | None — one write per post |
| Inactive users | **Wasted writes** — fan-out for users who don't open | No waste |
| Celebrity problem | Hard — millions of writes per post | Trivial — same as anyone else |
| Stale feed under failure | Until fan-out catches up | Always fresh on demand |
| Storage | Many copies of the same `post_id` (cheap as IDs) | One copy (in source-of-truth) |

**Hybrid (industry standard):**

| Author follower count | Strategy | Why |
|---|---|---|
| Normal user (< ~10 K followers) | Push to follower feeds | Fan-out is bounded; reads stay fast |
| Celebrity (≥ ~10 K) | Pull at read time | Avoid million-write storm per post |
| Sleeping users (no recent open) | Stop pushing; backfill on next open | Save writes |

> The threshold (10 K) is a tunable parameter. Twitter, Instagram, LinkedIn each pick differently.

**High-level architecture:**

```
Author posts ─► Post Service ─► Post Store (durable)
                    │
                    ▼
            Fan-out Service ──── Follower Graph ──► Async to message queue (Kafka)
                    │                                        │
                    ▼                                        ▼
            Feed Cache (Redis per user)           Per-follower writers
                    ▲
                    │
Reader ── Feed Service ─── ranks ─── merges celebrity posts (pull) ─── returns
```

| Component | Job |
|---|---|
| Post Service | Validate, persist post, kick off fan-out |
| Post Store | Durable record of all posts (DB or wide-column) |
| Follower Graph | Who follows whom — cache + DB |
| Fan-out Service | Decides push vs pull per author; emits write tasks |
| Feed Cache | Per-user pre-computed timeline (Redis sorted set, capped to ~1000 entries) |
| Feed Service | On read: load cache + merge celebrities + apply ranking |
| Ranking model | (optional) Scores candidates by recency × engagement × affinity |
| Media + CDN | Photos / videos served from S3 + CDN |

**Data model (relational + Redis):**

| Table / store | Schema |
|---|---|
| `posts` | `post_id` PK, `user_id` (idx), `content`, `media_urls`, `created_at` |
| `follows` | `(follower_id, followee_id)` PK, idx on `followee_id` for fan-out lookups |
| Redis ZSET per user | `feed:user:<id>` — members are `post_id`, scored by timestamp |
| Redis cache | Hot follower lists, celebrity post timelines |

**Fan-out write path (push):**

| Step | Action |
|---|---|
| 1 | Author posts — write to `posts` table |
| 2 | Enqueue fan-out task for the author's followers |
| 3 | Worker reads followers (paged, per-follower) |
| 4 | For each follower: `ZADD feed:user:<f> <ts> <post_id>` |
| 5 | Trim each feed to last N posts: `ZREMRANGEBYRANK feed:user:<f> 0 -N-1` |
| 6 | Skip pushes for sleeping users; mark them for backfill on next open |

> Async via message queue, partitioned by `followee_id` so per-author fan-out is single-flight.

**Read path (with hybrid):**

| Step | Action |
|---|---|
| 1 | Reader requests feed |
| 2 | Load `feed:user:<reader>` from Redis (last N post IDs) |
| 3 | Read author's celebrity-following list; query each celeb's recent posts |
| 4 | Merge by timestamp (or by ranking score) |
| 5 | Hydrate post bodies + author info from caches / Post Store |
| 6 | Return paginated response (cursor-based) |

**Ranking strategies:**

| Style | How |
|---|---|
| **Pure chronological** | Sort by `created_at` desc — Twitter classic, predictable |
| **Edge-weighted** | Score = `recency × affinity × engagement` — pick top-K |
| **ML-ranked** | Two-stage: candidate generation (recent posts from network), then DNN scorer |
| **Mixed** (real apps) | Cap top of feed with ranked picks; fill rest chronologically; inject suggested content |

**Pagination — never offset-based:**

| Approach | Why / why not |
|---|---|
| `OFFSET 200` | ❌ — DB walks every row; new posts shift positions; user sees duplicates |
| **Cursor based on `(timestamp, post_id)`** | ✅ — stable across new posts arriving |
| Continuation token (opaque) | ✅ — gives the server flexibility to evolve cursor format |

**Scaling each piece:**

| Pressure | Lever |
|---|---|
| Read QPS | Redis cluster sharded by `reader_id`; per-region replicas |
| Write fan-out spikes (celebrity post) | Backpressure via queue; rate-limit per author |
| Hot followee (celeb) reads | Cache celeb's last N posts globally; merge at read |
| Follower-graph lookups | In-memory cache; periodic refresh; pre-compute for top authors |
| Post storage | Shard by `user_id` (read-by-author) or `post_id` (write distribution) |
| Media | S3 + CDN; pre-warm CDN for top-engagement posts |

**Celebrity-problem mitigations (pick & combine):**

| Technique | Effect |
|---|---|
| Don't push if `follower_count > threshold` | Cap fan-out cost |
| Push only to **active** followers | Cuts writes for the long tail |
| Merge celebrity posts at read time | Bounded — usually < 100 celebs per reader |
| Pre-compute celeb timelines globally | Read pulls from a single shared cache |
| Tiered fan-out (push to top-active followers, pull for the rest) | Compromise on freshness |

**Failure modes:**

| Failure | Handling |
|---|---|
| Fan-out worker crashes mid-author | Queue retains tasks; idempotent `ZADD` |
| Author deleted post | Tombstone row; reader filters out tombstones |
| Cache eviction of `feed:user:<u>` | Rebuild on next read from Post Store + recent fan-out events |
| Follower-graph stale | Eventual consistency is acceptable — refresh periodically |
| Hot key in Redis (celebrity feed) | Replicate the hot key across shards or front with edge cache |

**Pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Pure push at any scale | Celebrity post → millions of writes; backpressure tips over |
| Pure pull at any scale | Read cost grows with followee count; latency unbounded |
| Pushing to sleeping users | Wasted writes for inactive accounts |
| Offset-based pagination | Inconsistent under new posts; expensive |
| Single Redis shard per user | One celeb follower list = one hot shard |
| Fan-out done synchronously | Author waits for follower count writes |
| No trim on feed cache | Unbounded ZSET growth |

**Rule of thumb:** **hybrid fan-out is the industry standard** — push for normal users, pull for celebrities. **Redis ZSET per user** for the cache, capped at ~1000 entries. **Async fan-out via partitioned message queue.** **Cursor-based pagination, never offset.** Push only to **active** followers; backfill on next open. Celebrities get pulled in at read time and ranked alongside cached posts.
