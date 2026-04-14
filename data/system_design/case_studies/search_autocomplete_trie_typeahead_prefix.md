### System Design: Search Autocomplete / Typeahead

**Requirements:**
- As user types, suggest top completions in real-time (<100ms)
- Based on popularity / trending / personalization
- Handle billions of queries per day
- Update suggestions as new queries come in

**Core data structure: Trie**
```
        root
       / | \
      h   b  ...
     /     \
    e       a
   / \       \
  l   r       t
 /     \
l       e
o        -> "here" (freq: 1000)
 -> "hello" (freq: 5000)
```

- Each node stores: character, children, top-K suggestions at this prefix
- Lookup: traverse trie by prefix, return pre-computed top-K
- O(prefix length) lookup time

**High-level design:**
```
User types "hel"
  -> API Gateway -> Autocomplete Service -> Trie Cache (Redis / in-memory)
                                         -> return ["hello", "help", "hello world"]

Background:
  Query logs -> Aggregation Service (hourly/daily) -> Rebuild Trie -> Push to Trie Cache
```

**Two main flows:**

**1. Query (real-time):**
- Client sends prefix after each keystroke (debounced, ~200ms delay)
- Service looks up prefix in trie, returns top-K completions
- Trie stored in memory or Redis for speed

**2. Update (offline):**
- Collect query logs (what users actually search for)
- Aggregate frequencies (hourly or daily MapReduce/Spark job)
- Rebuild trie with updated frequencies
- Push to cache nodes (rolling update)

**Optimizations:**
- **Debounce**: don't query on every keystroke, wait 200ms after last keypress
- **Browser caching**: cache prefix results (Cache-Control: max-age=60)
- **Prefix length limit**: only serve suggestions for prefixes >= 2 chars
- **Pre-compute top-K per node**: store results at each trie node, not just leaves
- **Sampling**: for very high traffic, sample 1/100 queries for frequency counting

**Data flow for frequency updates:**
```
Query logs (Kafka) -> Aggregation (Flink/Spark, hourly)
  -> Frequency table: {"hello": 50000, "help": 12000, ...}
  -> Trie builder -> Serialize trie -> Push to cache cluster
```

**Personalization (optional):**
- Blend global popular results with user's recent searches
- Score = global_popularity * 0.7 + personal_frequency * 0.3
- Store per-user recent queries in Redis (small sorted set)

**Scaling:**
- Trie fits in memory for most use cases (~100M queries = few GB)
- Shard by first character for extremely large datasets
- Each app server can hold a local copy (replicated trie)
- CDN caching for very popular prefixes

**Rule of thumb:** Trie with pre-computed top-K per node. Debounce on client (200ms). Rebuild trie offline (hourly). Cache aggressively (browser + server). Most autocomplete systems fit entirely in memory.
