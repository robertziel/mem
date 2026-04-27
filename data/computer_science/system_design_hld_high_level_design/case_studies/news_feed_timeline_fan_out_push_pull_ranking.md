### System Design: News Feed / Timeline

**Requirements:**
- User publishes a post, followers see it in their feed
- Feed is reverse chronological (optionally ranked)
- Support millions of users, some with millions of followers
- Low latency feed loading (<500ms)

**Core tradeoff: Fan-out on write vs Fan-out on read**

**Fan-out on write (push model):**
```
User posts -> write to every follower's feed cache immediately
```
- Pre-computed feed: read is fast (just fetch from cache)
- Write is expensive for users with many followers (celebrity problem)
- Good for: most users (< 10K followers)

**Fan-out on read (pull model):**
```
User opens feed -> query all followed users' posts -> merge and sort -> return
```
- Write is cheap (just write to your own timeline)
- Read is expensive (query N users, merge, sort)
- Good for: celebrities (millions of followers)

**Hybrid approach (best practice):**
- Regular users: fan-out on write (pre-compute followers' feeds)
- Celebrities (> 10K followers): fan-out on read (merge at read time)
- Feed = pre-computed cache + real-time merge of celebrity posts

**High-level design:**
```
Post Service -> Fan-out Service -> Feed Cache (Redis per user)
                                -> Post Store (database)

Feed Request -> Feed Service -> Read user's feed cache
                             -> Merge celebrity posts (fan-out on read)
                             -> Rank/sort -> Return
```

**Data model:**
```
posts:
  post_id     BIGINT PRIMARY KEY
  user_id     BIGINT INDEX
  content     TEXT
  media_urls  JSONB
  created_at  TIMESTAMP

feed_cache (Redis sorted set per user):
  key: feed:user:456
  members: post_ids scored by timestamp

follows:
  follower_id  BIGINT
  followee_id  BIGINT
  PRIMARY KEY (follower_id, followee_id)
  INDEX (followee_id)  -- for fan-out
```

**Feed generation (fan-out on write):**
```
1. User A posts
2. Fan-out service queries A's followers (from follows table or cache)
3. For each follower: ZADD feed:user:{follower} {timestamp} {post_id}
4. Trim feed to last N posts: ZREMRANGEBYRANK feed:user:{follower} 0 -N
```

**Feed ranking (optional):**
- Chronological: sort by timestamp (simple, Twitter-style)
- Algorithmic: score = f(recency, engagement, relevance, relationship)
- Typically: ML model scores candidate posts, top-K returned

**Scaling considerations:**
- Feed cache: Redis cluster, sharded by user_id
- Post store: shard by user_id or post_id
- Fan-out: async via message queue (Kafka/SQS), partition by followee
- Media: S3 + CDN
- Graph (follow relationships): dedicated store or cache

**Celebrity problem mitigation:**
- Don't fan-out for users with > N followers
- Merge their posts at read time (small number of celebrities per feed)
- Cache celebrity timelines separately

**Rule of thumb:** Hybrid fan-out is the industry standard. Push for normal users, pull for celebrities. Redis sorted sets for feed cache. Async fan-out via message queue. Always paginate feed responses (cursor-based).
