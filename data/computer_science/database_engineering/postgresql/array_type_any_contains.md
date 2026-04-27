### PostgreSQL Array Type

```sql
CREATE TABLE posts (tags TEXT[]);

INSERT INTO posts (tags) VALUES (ARRAY['ruby', 'rails', 'postgresql']);

-- Query: contains element
SELECT * FROM posts WHERE 'ruby' = ANY(tags);

-- Query: contains all of
SELECT * FROM posts WHERE tags @> ARRAY['ruby', 'rails'];

-- Query: overlaps (any match)
SELECT * FROM posts WHERE tags && ARRAY['ruby', 'python'];

-- GIN index for fast array queries
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- Array functions
SELECT array_length(tags, 1) FROM posts;
SELECT unnest(tags) FROM posts;  -- expand array to rows
```

**Rule of thumb:** Arrays for simple lists of values (tags, categories, phone numbers). GIN index for fast containment queries. For complex relationships, use a join table instead. JSONB is more flexible if you need nested structures.
