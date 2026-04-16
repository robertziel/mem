### System Design: Web Crawler / Search Engine

**Requirements:**
- Crawl billions of web pages
- Respect robots.txt and politeness (don't overload servers)
- Deduplicate content, handle traps (infinite URLs)
- Extract and index content for search
- Periodic recrawl for freshness

**High-level design:**
```
[Seed URLs] -> [URL Frontier (priority queue)]
                    |
              [Fetcher Workers] -> [DNS Resolver]
                    |                    |
              [Content Parser] -> [URL Extractor]
                    |                    |
              [Deduplication]    [URL Filter + Frontier]
                    |
              [Content Store] -> [Indexer] -> [Search Service]
```

**Key components:**

**1. URL Frontier (priority + politeness):**
- Priority queue: rank URLs by importance (PageRank, freshness, domain authority)
- Politeness queue: per-host queue with delay between requests
- One queue per domain, rate-limited (e.g., 1 request/second/domain)
```
Frontier:
  Priority router -> [High] [Medium] [Low]
  Politeness router -> [example.com: queue] [news.org: queue] [...]
  Each host queue has a cooldown timer
```

**2. Fetcher (distributed workers):**
- HTTP client with timeout, redirect following, retry
- Respect `robots.txt` (cache per domain)
- Handle: redirects, timeouts, 4xx/5xx, slow servers
- User-Agent identification

**3. Content deduplication:**
- URL deduplication: seen URL set (Bloom filter for memory efficiency)
- Content deduplication: hash page content (SimHash for near-duplicates)
- Bloom filter: probabilistic set membership, O(1), small memory, false positives OK
```
Before adding URL to frontier:
  if bloom_filter.might_contain(url): skip
  else: add to frontier, add to bloom_filter
```

**4. URL extraction and filtering:**
- Parse HTML, extract `<a href>` links
- Normalize URLs (remove fragments, canonicalize)
- Filter: skip images, PDFs, mailto, javascript:void
- Domain scoping: stay within allowed domains (for focused crawls)

**5. Content storage and indexing:**
- Raw HTML stored in object store (S3) or distributed filesystem
- Parsed content indexed in inverted index (Elasticsearch)
- Inverted index: word → list of (document_id, position, frequency)

**Inverted index:**
```
"distributed" -> [doc1:3, doc5:1, doc12:7]   (docID:frequency)
"systems"     -> [doc1:2, doc3:4, doc12:3]
"design"      -> [doc1:1, doc5:2, doc8:1]

Query "distributed systems":
  Intersect posting lists -> doc1, doc12
  Rank by TF-IDF, PageRank, freshness
```

**Scaling:**
- Fetchers: hundreds/thousands of workers, partitioned by domain hash
- URL frontier: distributed queue (Kafka partitioned by domain)
- Dedup: distributed Bloom filter or Redis set
- Storage: petabytes (S3 + Elasticsearch cluster)
- Recrawl: priority-based (news sites daily, static sites monthly)

**Estimation (Google-scale):**
- ~5 billion web pages
- Average page 100 KB → 500 TB raw storage
- Crawl rate: ~1,000 pages/second/worker × 1,000 workers = 1M pages/sec
- Full crawl cycle: days to weeks

**Rule of thumb:** URL frontier with politeness is the core challenge. Bloom filter for dedup (memory-efficient). Partition by domain for parallelism and politeness. Inverted index for search. Prioritize fresh and important pages for recrawl.
