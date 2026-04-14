### PostgreSQL Full-Text Search

**What it does:**
- Search text content by meaning (stemming, ranking, stop words)
- Built into PostgreSQL — no external service needed
- Often enough to avoid adding Elasticsearch

**Core concepts:**
- `tsvector` — document representation (tokenized, stemmed, with positions)
- `tsquery` — search query (operators: & | ! <>)
- GIN index — makes full-text search fast

**Basic usage:**
```sql
-- Convert text to tsvector
SELECT to_tsvector('english', 'The quick brown foxes jumped over lazy dogs');
-- 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2
-- Note: stemmed (foxes→fox, jumped→jump), stop words removed (the, over)

-- Search
SELECT * FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'ruby & rails');

-- Phrase search
SELECT * FROM articles
WHERE to_tsvector('english', body) @@ phraseto_tsquery('english', 'domain driven design');
```

**Stored tsvector column (fast):**
```sql
-- Add column and index
ALTER TABLE articles ADD COLUMN search_vector tsvector;

UPDATE articles SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B');

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- Keep it updated with a trigger
CREATE TRIGGER articles_search_update
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, body);
```

**Weighted search (title matters more):**
```sql
-- A = highest weight, D = lowest
setweight(to_tsvector('english', title), 'A') ||
setweight(to_tsvector('english', body), 'B')

-- Ranking
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'postgresql & performance') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

**Search operators:**
```sql
'ruby & rails'           -- AND: must contain both
'ruby | python'          -- OR: either
'!java'                  -- NOT: exclude
'ruby <-> on <-> rails'  -- FOLLOWED BY: phrase
'web <2> development'    -- NEAR: within 2 words
```

**Highlighting results:**
```sql
SELECT ts_headline('english', body, to_tsquery('english', 'postgresql'),
  'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15')
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql');
-- Returns: "...optimize your <b>PostgreSQL</b> queries for better..."
```

**PostgreSQL FTS vs Elasticsearch:**
| Feature | PostgreSQL FTS | Elasticsearch |
|---------|---------------|---------------|
| Setup | Built-in, zero infra | Separate cluster |
| Scale | Millions of docs | Billions of docs |
| Features | Basic search, ranking | Fuzzy, autocomplete, facets, aggregations |
| Maintenance | None (part of DB) | Cluster management, sharding |
| Real-time | Immediate (same transaction) | Near real-time (~1 second) |
| Best for | Moderate search needs | Search-heavy products |

**Rule of thumb:** Start with PostgreSQL FTS (zero infrastructure). Use weighted tsvector columns with GIN index. Switch to Elasticsearch only when you need: fuzzy matching, autocomplete, faceted search, or billions of documents. For most Rails apps, PostgreSQL FTS is more than enough.
