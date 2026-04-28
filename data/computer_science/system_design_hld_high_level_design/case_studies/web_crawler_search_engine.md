### System Design: Web Crawler / Search Engine

**Scope:** crawl billions of pages, respect politeness (`robots.txt`, per-host rate), deduplicate, index for search, recrawl for freshness.

**Pipeline:**

```
Seed URLs ─► URL Frontier (priority + politeness)
                ↓
        Fetcher Workers ── DNS resolver ── robots.txt cache
                ↓
        Content Parser ─► URL Extractor + Normalizer
                ↓                    ↓
        Content Dedup        URL Dedup (Bloom)
                ↓                    ↓
        Content Store        URL Filter ─► back to Frontier
                ↓
            Indexer ─► Inverted Index ─► Search Service
```

**Components:**

| Component | Job | Key concern |
|---|---|---|
| URL Frontier | Schedule what to fetch next | Priority + politeness simultaneously |
| Fetcher pool | HTTP fetch with retry, timeout, redirect, robots.txt | Respect rate limits per host |
| DNS resolver | Resolve hostnames | Cache aggressively — DNS dominates if not cached |
| Parser | Extract text + links from HTML | Tolerate malformed markup |
| URL Normalizer | Canonical form (lowercase host, drop fragment, sort query) | Prevents counting same page twice |
| URL Dedup | Have we seen this URL? | Memory-efficient (Bloom filter) |
| Content Dedup | Have we seen this content? | Near-duplicate detection (SimHash) |
| Content Store | Raw HTML (object store) | Cheap, immutable |
| Indexer | Build inverted index | Periodically re-segment |
| Search service | Query → ranked results | Fan-out across shards, merge, rank |

**URL Frontier — politeness and priority must coexist:**

| Goal | Mechanism |
|---|---|
| **Priority** (PageRank, freshness, domain authority) | Top-level priority queues (high / medium / low) |
| **Politeness** (don't overload one host) | One queue per host with cool-off timer |
| **Selection** | Pop a host whose cool-off has expired, take its highest-priority URL |

> A naive global priority queue **violates politeness** (would hammer the highest-priority host). A naive per-host queue **violates priority** (treats every host equally). The frontier is two queues coordinated by a host scheduler.

**Politeness rules:**

| Source | Rule |
|---|---|
| `robots.txt` | Cache per host; honor `Disallow`, `Crawl-delay`, `Sitemap` |
| Per-host concurrency | Usually 1 request at a time per host |
| Per-host delay | 1–10 s between requests, or what `Crawl-delay` says |
| User-Agent header | Identify yourself; provide contact URL |
| Backoff on 429 / 503 | Exponential — they're explicitly asking |

**URL deduplication — Bloom filter math:**

| Property | Value |
|---|---|
| Use | "Have we already seen this URL?" |
| Cost | ~10 bits/element for ~1% FPR |
| 5 B URLs at 1% FPR | ~6 GB RAM (single shard) — easily distributed |
| False positive | Skipped — but may rediscover via another path |
| False negative | **Impossible** — if Bloom says "not seen", it really hasn't been |

**Content deduplication (near-duplicates, not exact):**

| Technique | What it catches |
|---|---|
| Exact-match hash (SHA256) | Identical content (mirrors, exact reposts) |
| **SimHash** | Near-duplicates differing by ads/headers/timestamps |
| MinHash + LSH | Set-similarity at scale |
| Shingling | Robust to minor reorderings |

**URL normalization (so the same page doesn't get crawled 5×):**

| Step | Example |
|---|---|
| Lowercase scheme + host | `HTTP://Example.com/` → `http://example.com/` |
| Drop default port | `:80` for HTTP, `:443` for HTTPS |
| Drop fragment | `#section` |
| Decode percent-encoding (where safe) | `%7E` → `~` |
| Sort + canonicalize query params | `?b=2&a=1` → `?a=1&b=2` |
| Strip tracking params | `utm_source`, `gclid`, `fbclid` |
| Resolve relative paths | `/a/../b` → `/b` |
| Trailing slash policy | Pick one (with or without) and stick to it |

**Crawler traps (and what stops them):**

| Trap | Defense |
|---|---|
| Calendar / search-result loops (`?date=…&page=…`) | Per-host depth limit; per-host URL count cap |
| Session IDs in URL | Strip known session-id params at normalization |
| Infinite-redirect chains | Max redirect depth (≤ 5) |
| Bot mazes | Per-host budget + content-similarity dedup |
| Huge dynamic pages | Max page size (e.g. 5 MB) |

**Inverted index (the search-side data structure):**

```
"distributed" ─► [doc1:3, doc5:1, doc12:7, ...]   (docID:term-freq)
"systems"     ─► [doc1:2, doc3:4, doc12:3, ...]

Query "distributed systems":
  intersect posting lists → docs containing both
  rank by TF-IDF + PageRank + freshness + recency boost
```

| Index piece | Purpose |
|---|---|
| Term dictionary | Map term → posting-list location |
| Posting list | `(doc_id, term_freq, positions)` per term |
| Skip pointers | Fast intersection for Boolean queries |
| Document store | Title, snippet, URL — fetched after ranking the top-K |
| Per-shard index | Partitioned for parallelism — fan-out + merge at query time |

**Ranking signals (mix and weight):**

| Signal | What it captures |
|---|---|
| TF-IDF / BM25 | Term-document relevance |
| PageRank / domain authority | Trust / link-graph importance |
| Freshness | Recency-weighted boost |
| Click-through rate (live signal) | What real users picked when shown |
| Personalization | History, location, language |
| Quality / spam classifiers | Demote low-quality content |

**Recrawl strategy — different cadence per page type:**

| Page type | Cadence |
|---|---|
| Major news / homepages | Minutes |
| Active blogs | Hours |
| Static / reference pages | Days–weeks |
| Long-tail / rarely-changing | Months |
| Sitemap-declared `lastmod` | Honor what the site claims |

**Scaling each piece:**

| Piece | Pattern |
|---|---|
| Fetchers | Hundreds–thousands of workers, partitioned by host hash |
| Frontier | Distributed queue (Kafka partitioned by domain) |
| URL dedup | Distributed Bloom filter or Redis sets per shard |
| Content store | Object storage (S3 / GCS) — petabytes |
| Indexer | Map-reduce or streaming index builders |
| Search | Inverted index sharded by document or by term, fan-out at query time |

**Capacity sanity check (very rough, illustrative):**

| Number | Implication |
|---|---|
| ~5 B web pages | ~500 TB raw HTML at 100 KB/page |
| 1 000 fetchers × 1 000 pages/s | ~1 M pages/sec — full crawl in days |
| 1% Bloom FPR over 5 B URLs | ~6 GB total — split across shards |

**Failure modes:**

| Failure | Handling |
|---|---|
| Slow / dead host | Per-host circuit breaker; back off and retry later |
| robots.txt unreachable | Conservative default — don't crawl until fetched |
| Frontier worker dies | Tasks redelivered; idempotent fetch (URL is the key) |
| Indexer falls behind | Buffer to disk; backpressure the frontier |
| Search shard down | Serve from replicas; degrade to fewer shards' results |

**Pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Global priority queue (no per-host) | Hammers high-PR domains, gets blocked |
| Per-host queue (no priority) | Crawl follows the slowest, dumbest links |
| URL dedup without normalization | Same page indexed multiple times |
| Bloom filter undersized | FPR climbs; pages skipped silently |
| No content dedup | Near-duplicates flood index, dilute ranking |
| Ignoring robots.txt | Legal + reputational risk; bans |
| Recrawling everything at the same cadence | Wastes budget on stable pages, misses fresh news |
| Indexing whole HTML | Boilerplate + nav drowns out real content; extract main content first |

**Rule of thumb:** the **frontier — priority queue + per-host politeness — is the central data structure**, and most of the engineering goes there. **Bloom filter for URL dedup, SimHash for content dedup**, **normalize URLs** before either. **Partition by domain hash** so politeness scales naturally and per-host state is local. **Inverted index** is the search-side workhorse; ranking is a weighted sum of TF-IDF/BM25, PageRank, and freshness.
