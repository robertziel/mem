### SQL vs NoSQL: Choosing the Right Database

**SQL (Relational):**
- Structured data with relationships (foreign keys, JOINs)
- Strong consistency, ACID transactions
- Schema enforced (structured, predictable)
- Mature tooling, SQL is universal
- Examples: PostgreSQL, MySQL, SQLite

**NoSQL categories:**

| Type | Model | Examples | Best for |
|------|-------|---------|----------|
| Document | JSON-like documents | MongoDB, CouchDB | Flexible schema, nested data |
| Key-Value | Simple key -> value | Redis, DynamoDB, Memcached | Caching, sessions, simple lookups |
| Wide-Column | Rows with dynamic columns | Cassandra, HBase, ScyllaDB | Time-series, IoT, high write throughput |
| Graph | Nodes + edges | Neo4j, Amazon Neptune | Relationships (social networks, fraud) |

**When to choose SQL:**
- Complex queries with JOINs across multiple entities
- Transactions spanning multiple tables (ACID)
- Data has clear structure and relationships
- Reporting and analytics (aggregations)
- You're building a typical CRUD application
- You value data integrity above all

**When to choose NoSQL:**
- Schema changes frequently / schema-less data
- Massive scale (millions of writes/sec)
- Simple access patterns (key-based lookup)
- Denormalized, hierarchical data (documents)
- Geographic distribution with eventual consistency
- Time-series, IoT, or event data at scale

**Decision matrix:**
| Requirement | Choose |
|------------|--------|
| Complex queries, JOINs | SQL |
| ACID transactions | SQL |
| Flexible schema | Document (MongoDB) |
| High write throughput | Wide-column (Cassandra) |
| Simple key-value access | Key-value (Redis, DynamoDB) |
| Graph traversal (friends-of-friends) | Graph (Neo4j) |
| Time-series at scale | Wide-column or specialized (TimescaleDB, InfluxDB) |

**Common hybrid approach:**
- PostgreSQL as primary database (ACID, relationships)
- Redis for caching and sessions
- Elasticsearch for full-text search
- DynamoDB or Cassandra for high-throughput specific use cases
- S3 for blob storage

**PostgreSQL as a "multi-model" database:**
- JSONB: document store within SQL (flexible schema per column)
- Full-text search: `tsvector` and `tsquery` (often enough, avoids Elasticsearch)
- Geospatial: PostGIS extension
- Time-series: TimescaleDB extension
- Key-value: hstore or JSONB

**Rule of thumb:** Start with PostgreSQL for most applications (it does 80% of what you need). Add specialized databases only when PostgreSQL can't meet a specific requirement (extreme write throughput, graph queries, sub-millisecond caching). Avoid "polyglot persistence" until you actually need it.
