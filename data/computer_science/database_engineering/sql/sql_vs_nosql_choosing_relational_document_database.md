### SQL vs NoSQL — Choosing the Right Database

**Definition:** four NoSQL families plus relational SQL each shine in different shapes. **Default to PostgreSQL** for most apps — it covers ~80% of needs (including JSON, full-text search, geo, time-series via extensions). Reach for specialized stores only when Postgres can't meet a specific requirement at scale.

**SQL (relational) — the default:**

| Property | Detail |
|---|---|
| **Structured** data with explicit relationships | Foreign keys, JOINs |
| **ACID** transactions | Strong consistency |
| **Schema enforced** | Predictable, type-safe |
| **Mature tooling** | SQL is universal |
| Examples | PostgreSQL, MySQL, SQLite, SQL Server, Oracle |

**Four NoSQL families:**

| Type | Model | Examples | Best for |
|---|---|---|---|
| **Document** | JSON-like documents | MongoDB, CouchDB, Firestore | Flexible schema, nested data |
| **Key-Value** | Simple `key → value` | Redis, DynamoDB, Memcached, etcd | Caching, sessions, simple lookups |
| **Wide-Column** | Rows with dynamic columns | Cassandra, HBase, ScyllaDB, Bigtable | Time-series, IoT, high write throughput |
| **Graph** | Nodes + edges | Neo4j, Amazon Neptune, ArangoDB | Relationships (social networks, fraud, knowledge graphs) |
| **Vector** (newer) | Embedding vectors | Pinecone, Weaviate, pgvector | Semantic search, RAG |
| **Time-series** | Time-stamped points | InfluxDB, TimescaleDB | Metrics, IoT |

**When to choose SQL:**

| Need | Why |
|---|---|
| Complex queries with JOINs | SQL is built for this |
| ACID transactions across tables | Strong guarantees |
| Clear data structure with relationships | Schema-first |
| Reporting + analytics (aggregations) | OLAP queries |
| Typical CRUD application | 90% of business apps |
| Data integrity priority | FKs + constraints |

**When to choose NoSQL:**

| Need | Why |
|---|---|
| Schema changes frequently | Flexibility |
| Massive scale (millions of writes/sec) | Horizontal write scale |
| Simple key-based access | KV is faster |
| Denormalized hierarchical data | Documents fit naturally |
| Geographic distribution + eventual consistency | DynamoDB Global, Cassandra |
| Time-series at extreme scale | Wide-column or specialized |
| Graph traversals | Native graph DBs |

**Decision matrix — by access pattern:**

| Requirement | Choose |
|---|---|
| Complex queries, JOINs | **SQL** (Postgres / MySQL) |
| ACID across multiple tables | **SQL** |
| Flexible schema | Document (MongoDB) |
| High write throughput, time-series | Wide-column (Cassandra, ScyllaDB) |
| Sub-ms key-value lookup | Key-value (Redis, DynamoDB) |
| Graph traversal (friends-of-friends) | Graph (Neo4j) |
| Semantic / vector search | Vector DB or pgvector |
| Embedded / app-local | SQLite |
| Analytics / OLAP | Warehouse (Snowflake, BigQuery, Redshift) |
| Streaming / events | Kafka |

**SQL vs NoSQL by characteristic:**

| Characteristic | SQL | NoSQL |
|---|---|---|
| Schema | Strict | Flexible / dynamic |
| Joins | Native | Application-level |
| Transactions | ACID | Often BASE |
| Scaling | Vertical mostly + read replicas + sharding | Horizontal native |
| Query language | SQL (universal) | Per-system (often less expressive) |
| Consistency | Strong by default | Configurable, often eventual |
| Indexes | B-tree, GIN, GiST, BRIN | Varies; secondary indexes often expensive |
| Best for | Complex relations, integrity | Scale, flexibility, denormalized |

**NoSQL caveats — what's lost:**

| Lost | Detail |
|---|---|
| Joins | Denormalize or call multiple times |
| Strong consistency by default | Configurable in many; default is often eventual |
| Schema enforcement | Bad data sneaks in |
| Mature tooling | SQL has decades of tooling, BI integration |
| Query expressiveness | Many NoSQL query languages limited |
| Reporting-friendly | Most NoSQL not OLAP-friendly |

**The "polyglot persistence" hybrid:**

```
   Postgres                  ← Primary OLTP, relational
   Redis                     ← Cache, sessions, pub/sub
   Elasticsearch / OpenSearch ← Full-text search at scale
   DynamoDB / Cassandra      ← High-throughput specific use cases
   S3                        ← Blob / object storage
   Snowflake / BigQuery      ← Analytics warehouse
   Pinecone / pgvector       ← Vector search for AI
```

**Postgres as a "multi-model" database:**

| Built-in / extension | Use |
|---|---|
| **JSONB** | Document store within SQL |
| **Full-text search** (`tsvector`) | Often replaces Elasticsearch |
| **PostGIS** | Geospatial queries |
| **TimescaleDB** | Time-series |
| **pgvector** | Vector search / embeddings |
| **hstore** | KV (legacy; JSONB usually better) |
| **`uuid-ossp`** | UUID generation |
| **`pg_trgm`** | Fuzzy / trigram search |
| **Logical replication** | Selective sync |
| **Foreign Data Wrappers** | Query other DBs as tables |

> **Postgres covers ~80% of the use cases people reach for NoSQL** — start here, then add specialized stores only if you hit specific bottlenecks.

**Common patterns:**

| Need | Postgres approach | NoSQL alternative |
|---|---|---|
| Sessions | Table or JSONB | Redis |
| Cache | Materialized views or unlogged table | Redis / Memcached |
| Search | `tsvector` | Elasticsearch |
| Hot counters | `UPDATE` with row lock | Redis INCR |
| Per-row metadata | JSONB column | MongoDB |
| Geo | PostGIS | MongoDB GeoJSON, ElasticSearch |
| Time-series | TimescaleDB | InfluxDB |
| Vector | pgvector | Pinecone / Weaviate |

**When to actually leave Postgres:**

| Bottleneck | Switch to |
|---|---|
| Sustained > 50K writes/sec on one table | Wide-column (Cassandra) |
| Globally distributed multi-master writes | DynamoDB Global, Cosmos, Spanner |
| Sub-ms p99 read latency at scale | Redis or DynamoDB |
| Graph queries with deep traversals | Neo4j |
| Petabyte-scale OLAP | Snowflake / BigQuery |
| > 100M vectors with low latency | Specialized vector DB |
| Massive event ingestion + replay | Kafka |

**ACID vs BASE:**

| Property | ACID (SQL) | BASE (NoSQL) |
|---|---|---|
| **A** | Atomicity | Basically Available |
| **C** | Consistency | Soft state |
| **I** | Isolation | Eventual consistency |
| **D** | Durability | — |
| Use case | Money, inventory | Scale, flexibility |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| MongoDB for relational data | JOINs in app, perf hit |
| Postgres for billions of writes / sec | Wrong shape |
| Premature polyglot persistence | Operational nightmare |
| DynamoDB without thinking about access patterns | Hot partitions, scan costs |
| Cassandra for OLTP with strict transactions | BASE not ACID |
| SQL with everything in JSONB | Loses relational benefits |
| Ignoring DB-level scaling (replicas, partitioning) and jumping to NoSQL | Often fixable in SQL |
| Document store for highly relational data | Many round trips |

**Decision tree:**

```
Need complex queries / JOINs / ACID?
   YES → SQL (Postgres default)
   NO →
       Need extreme write throughput?
          YES → Wide-column (Cassandra)
       Need sub-ms KV?
          YES → Redis / DynamoDB
       Need flexible doc schema?
          YES → MongoDB
       Need graph traversal?
          YES → Neo4j
       Need vector search?
          YES → Vector DB / pgvector
       Otherwise → Postgres
```

**Cross-references:**

- CAP / PACELC: [cap_theorem_*.md](../../distributed_systems/cap_theorem_pacelc_consistency_availability.md)
- DB scaling: [database_scaling_*.md](../../system_design_hld_high_level_design/fundamentals/database_scaling_sharding_replication_read_replicas.md)
- Postgres vs MongoDB: [postgresql_vs_mongodb_*.md](../mongodb/postgresql_vs_mongodb_differences.md)
- Data warehouse / lake / lakehouse: [data_warehouse_lake_*.md](../../data_engineering/data_warehouse_lake_olap_star_schema_lakehouse.md)

**Rule of thumb:** **Start with PostgreSQL** — it does ~80% of what most apps need (relational + JSONB + search + geo + time-series + vector via extensions). Add specialized databases (**Redis**, **Cassandra**, **Neo4j**, etc.) only when Postgres can't meet a specific bottleneck. Avoid **polyglot persistence** until forced — every additional store adds operational cost.
