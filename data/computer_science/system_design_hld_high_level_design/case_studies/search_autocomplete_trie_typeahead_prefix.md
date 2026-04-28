### System Design: Search Autocomplete / Typeahead

**Scope:** suggest top-K completions for a typing user in **< 100 ms**, ranked by popularity / personalization / freshness, at billions of queries/day.

**Architecture:**

```
User types ──► CDN (popular prefixes)
              │ miss
              ▼
        API Gateway ──► Autocomplete Service ──► Trie Cache (in-memory / Redis)
                                                    ▲
                                                    │ rebuilt periodically
              ┌────────────────────────────────────┘
              │
        Query Logs (Kafka)
              │
              ▼
        Aggregation (Flink / Spark, hourly)
              │
              ▼
        Frequency Table → Trie Builder → push to cache
```

**Two paths — real-time read, offline write:**

| Path | Latency | Data |
|---|---|---|
| **Query** (real-time) | < 100 ms | Read pre-computed trie |
| **Update** (offline / async) | Hours of lag | Rebuild trie from query-log aggregations |

> The point of the design is to **decouple read from write**: build the index slowly, serve it instantly.

**Data structure choices — pick by need:**

| Structure | Lookup | Memory | Strength | Weakness |
|---|---|---|---|---|
| **Trie** (prefix tree) | O(prefix length) | High (one node per char × prefixes) | Fastest prefix lookup; share common prefixes | Memory; slow updates if rebuilt naively |
| **Trie + top-K stored at each node** | O(prefix length) | Higher | **No traversal of subtree at query time** — O(1) after navigation | Bigger; more rebuild cost |
| **Compressed trie / Patricia trie / Radix tree** | O(prefix length) | Lower than plain trie | Compresses single-child chains | More complex insert/delete |
| **Ternary search tree** | O(prefix length + log alphabet) | Medium | Good for skewed alphabets | Less popular |
| **Sorted list + binary search** | O(log N) | Low | Simple | Subtree filter requires range scan |
| **Inverted index** (Elasticsearch n-grams / edge-ngram) | O(log V + K) | High | Combines text search + filtering + ranking | Heavier infra; >100 ms typical |
| **FST / DAWG** | O(prefix) | **Very low** (shared suffixes) | Used in Lucene; immutable | Rebuild only |
| **DB index `WHERE q LIKE 'pre%'`** | DB-dependent | DB | Easiest | Slowest; bad at scale |

**Trie node — what it stores:**

| Field | Purpose |
|---|---|
| `char` | The edge label |
| `children` | Map of child nodes |
| `is_word` | True if this node is an actual completion |
| `frequency` | Popularity score |
| `top_k` (precomputed) | List of best completions starting with this prefix — **the speed trick** |

**Two flows in detail:**

| Flow | Steps |
|---|---|
| **Query** | Client debounces (~150–250 ms) → server walks trie by prefix → reads precomputed `top_k` → returns; total < 50 ms server-side |
| **Update** | Kafka consumes query logs → hourly Flink/Spark aggregation → frequency table → rebuild trie → push to cache cluster (rolling) |

**Ranking signals — what feeds the score:**

| Signal | Weight |
|---|---|
| Global popularity (query frequency over time window) | High — primary |
| Recency / trending boost | Medium — capture spikes |
| Click-through rate (queries that actually got clicks) | Medium |
| Personal history (recent searches by this user) | Low–medium, blended |
| Geographic relevance | Optional |
| Language / locale | Filter |
| Spelling correction | "Did you mean" fallback |

**Score blending example:**

```
score(q | prefix, user, locale)
  = α × global_freq(q, window=7d)
  + β × trending_boost(q, window=1h)
  + γ × ctr(q)
  + δ × personal_freq(q, user)
  − penalty(q, blocklist, age, ...)
```

> Tune α/β/γ/δ by A/B test.

**Personalization — without breaking the cache:**

| Strategy | How |
|---|---|
| **Two-stage** | Cache returns global top-50; rerank top-K per user from a small per-user store |
| **Per-user recent searches in Redis** | `ZADD` sorted set, capped to N entries; merge into final result |
| **Locale-bucketed cache** | One trie per (country, language) — variants share where possible |
| **No personalization for anonymous** | Cheap path for cold visitors |

**Update strategies — pick by required freshness:**

| Strategy | Lag |
|---|---|
| **Hourly batch rebuild** | ~1 h |
| **Streaming ingest + periodic merge** | Minutes |
| **Append-only "delta" trie + merge** | Sub-minute |
| **Direct write through to live trie** | Real-time but expensive (locks, contention) |

**Scaling each piece:**

| Pressure | Lever |
|---|---|
| Read QPS | Replicate trie to every app server (in-memory); CDN for popular prefixes |
| Memory per replica | Compress (radix), shard by first character, drop low-frequency completions |
| Index size | Cap at top-K per node; cap minimum frequency; per-locale tries |
| Update throughput | Async pipeline; multiple sub-tries built in parallel by alphabet shard |
| Cold start | Pre-warm new replicas before adding to LB |

**Optimizations checklist:**

| Optimization | Effect |
|---|---|
| **Client debounce** (150–250 ms after last keypress) | Cuts QPS dramatically |
| **Min prefix length** (≥ 2 chars) | Avoid millions of single-char queries |
| **Browser cache** (`Cache-Control: max-age=60`) | Repeated typing reuses |
| **CDN caching** for popular prefixes | Many requests never hit your origin |
| **Top-K precomputed per node** | No per-query subtree scan |
| **Sampling** for frequency counting (1/N) | Cheap aggregation at huge volume |
| **Bloom filter for "no completions"** | Skip known-empty prefixes |
| **Compress JSON over the wire** | Smaller payloads matter at every keystroke |

**Capacity sanity check:**

| Quantity | Rough |
|---|---|
| Distinct queries/day | 1B |
| Unique queries (after dedup) | 100M |
| Avg prefix length to cache | 5 chars |
| Trie size (in memory) | A few GB — fits on one box for most products |

**Failure modes:**

| Failure | Handling |
|---|---|
| Cache replica dies | Other replicas serve; rebuild on its return |
| Trie rebuild produces a bad artifact | Roll back to previous artifact; canary new builds |
| Query log spike (script-kid attack) | Rate-limit per IP; debounce server-side |
| One prefix becomes hot (current event) | Trending boost expected; CDN absorbs popular query |
| Personal store down | Fall back to global-only — graceful degradation |

**Spelling tolerance — fuzziness:**

| Tactic | Detail |
|---|---|
| **Edit distance ≤ 1 fallback** | "halo" → propose "hello" |
| **Phonetic encoding** (Soundex, Metaphone) | "kat" → "cat" |
| **Symspell / BK-tree** | Fast approximate match for typos |
| **Did-you-mean** layer | Triggered after low-result query, not in autocomplete itself |

**Anti-patterns:**

| Pitfall | Effect |
|---|---|
| `WHERE col LIKE 'pre%'` on a big table | DB-bound; latency unpredictable |
| Computing top-K at query time (subtree scan) | Slow; precompute |
| Rebuilding the trie on every update | Cache hit rate drops; thrash |
| Personalizing before global ranking | Hard to cache; latency creep |
| No min prefix length | Massive QPS for `a`, `b`, `c` |
| One global trie for all languages | Bad relevance; bad memory locality |
| Synchronous personal-store read on hot path | Adds 10–30 ms unnecessarily |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Greenfield, < 1 M queries/day | DB index + `LIKE` is fine |
| 10 M+ queries/day, latency sensitive | In-memory trie + precomputed top-K |
| Need fuzzy matching | Symspell / BK-tree on top of trie |
| Need text-search + filters | Elasticsearch with `edge_ngram` / `completion suggester` |
| Multi-region, eventual consistency OK | Per-region trie replicas |
| Realtime trending | Streaming Flink job + delta trie |

**Rule of thumb:** **trie with pre-computed top-K per node** is the workhorse. **Decouple offline aggregation from real-time read** — rebuild hourly, serve in-memory. **Debounce on the client** (150–250 ms) and **CDN-cache popular prefixes**. Personalize as a **rerank** of a globally cached top-50, not by busting the cache. Most autocomplete systems comfortably fit in memory — fight the urge to overengineer it as Elasticsearch.
