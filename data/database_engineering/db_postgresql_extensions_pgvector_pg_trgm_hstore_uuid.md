### PostgreSQL Extensions

**What extensions do:**
- Add features to PostgreSQL without modifying core
- Installed per-database: `CREATE EXTENSION extension_name;`
- Available on RDS/Aurora (most popular ones)

**Most useful extensions:**

**pgvector (AI/ML vector similarity search):**
```sql
CREATE EXTENSION vector;
CREATE TABLE documents (
  id BIGINT PRIMARY KEY,
  content TEXT,
  embedding vector(1536)   -- OpenAI embedding dimension
);
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Find similar documents
SELECT content, 1 - (embedding <=> query_embedding) AS similarity
FROM documents
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

**pg_trgm (trigram fuzzy matching):**
```sql
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);

-- Fuzzy search (typo-tolerant)
SELECT * FROM users WHERE name % 'jonh';        -- similarity match
SELECT * FROM users WHERE name ILIKE '%john%';   -- uses trigram index (fast)

-- Similarity score
SELECT name, similarity(name, 'jonh') AS score
FROM users
WHERE name % 'jonh'
ORDER BY score DESC;
```

**PostGIS (geospatial):**
```sql
CREATE EXTENSION postgis;
ALTER TABLE stores ADD COLUMN location geography(POINT, 4326);

-- Find stores within 5km
SELECT name, ST_Distance(location, ST_MakePoint(-122.4, 37.7)::geography) AS distance_m
FROM stores
WHERE ST_DWithin(location, ST_MakePoint(-122.4, 37.7)::geography, 5000)
ORDER BY distance_m;
```

**uuid-ossp / pgcrypto (UUID generation):**
```sql
CREATE EXTENSION pgcrypto;
SELECT gen_random_uuid();   -- v4 UUID (random)

-- Or
CREATE EXTENSION "uuid-ossp";
SELECT uuid_generate_v4();
```

**hstore (key-value pairs):**
```sql
CREATE EXTENSION hstore;
ALTER TABLE products ADD COLUMN metadata hstore;

INSERT INTO products (metadata) VALUES ('color => red, size => XL');
SELECT metadata->'color' FROM products;    -- 'red'
SELECT * FROM products WHERE metadata ? 'color';  -- has key 'color'
```
Note: JSONB has largely replaced hstore (more flexible).

**pg_stat_statements (query performance):**
```sql
CREATE EXTENSION pg_stat_statements;

-- Top slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

**Other notable extensions:**
| Extension | Purpose |
|-----------|---------|
| `pg_partman` | Automated table partition management |
| `pgaudit` | Detailed audit logging |
| `pg_repack` | Online table reorganization (alternative to VACUUM FULL) |
| `pgbouncer` | Connection pooling (separate tool, not an extension) |
| `timescaledb` | Time-series database on PostgreSQL |
| `citus` | Distributed PostgreSQL (sharding) |

**Rule of thumb:** pg_stat_statements on every production database (find slow queries). pg_trgm for fuzzy search. pgvector for AI/ML embeddings. PostGIS for geospatial. PostgreSQL extensions let you avoid adding external services (Elasticsearch, Redis, vector DB) for many use cases.
