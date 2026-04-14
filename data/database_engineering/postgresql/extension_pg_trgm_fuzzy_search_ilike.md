### PostgreSQL Extension: pg_trgm (Fuzzy Search)

```sql
CREATE EXTENSION pg_trgm;

-- GIN index for fast ILIKE and similarity queries
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);

-- Fast ILIKE (uses trigram index)
SELECT * FROM users WHERE name ILIKE '%john%';

-- Fuzzy search (typo-tolerant)
SELECT name, similarity(name, 'jonh') AS score
FROM users
WHERE name % 'jonh'    -- % operator: similarity > threshold
ORDER BY score DESC;
```

**Rule of thumb:** pg_trgm for typo-tolerant search and fast `ILIKE`. No external service needed. Great for: user search, autocomplete, "did you mean?" suggestions.
