### PostgreSQL Extension: pgvector (Vector Similarity Search)

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
  id BIGINT PRIMARY KEY,
  content TEXT,
  embedding vector(1536)  -- OpenAI embedding dimension
);

-- HNSW index (best recall, recommended)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Find 5 most similar documents
SELECT content, 1 - (embedding <=> query_vector) AS similarity
FROM documents
ORDER BY embedding <=> query_vector  -- <=> is cosine distance
LIMIT 5;
```

**Rule of thumb:** pgvector if you're already on PostgreSQL and have < 10M vectors. Avoids adding a separate vector database. HNSW index for best recall. Use for: RAG, recommendation, semantic search.
