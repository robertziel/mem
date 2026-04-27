### MongoDB vs Relational Modeling Pitfalls (Anti-patterns from SQL Habits)

**Core mistake:** treating MongoDB like SQL with JSON syntax — normalizing into separate collections, then `$lookup`-ing everything back together at read time.

**Mindset shift:**

| | SQL | MongoDB |
|---|---|---|
| Design driver | Entity relationships, normal forms | Query patterns / read shape |
| Duplication | Avoid (3NF) | Accept it for reads, manage on writes |
| Joins | Cheap, expected | `$lookup` exists but is costly — design around |
| Schema | Enforced by DB | Enforced by app + Mongoose/Mongoid validators |
| FK integrity | DB-level constraint | App-layer validation + snapshots |

**Anti-pattern catalog:**

| # | Anti-pattern | Symptom | Fix |
|---|---|---|---|
| 1 | One collection per "table" | Every read needs 3+ `$lookup`s | Embed what's read together (`profile`, `settings`, `addresses` inside `users`) |
| 2 | `$lookup` as universal JOIN | Slow aggregations, complex pipelines | Denormalize at write time — copy `customer.name` into `orders` |
| 3 | Expecting FK enforcement | Orphan references silently appear | App-layer `validates :presence`; for critical refs embed a **snapshot** |
| 4 | Over-embedding (5+ levels deep) | Hard to query, partial updates ugly, 16MB doc limit | Separate collections for entities with their own lifecycle |
| 5 | Storing only IDs (under-embedding) | List views need N extra queries | Denormalize frequently-displayed fields (author name + avatar) |
| 6 | Applying 1NF/2NF/3NF | Anti-MongoDB design | Duplicate freely when it serves queries; multikey index on arrays for membership filters |
| 7 | Auto-increment IDs | Counter collection becomes hot contention point | Use `ObjectId` (timestamp + machine + counter); add `order_number` field separately if humans need it |
| 8 | Unbounded embedded arrays | Doc grows forever, hits 16MB, slows everything | Bounded array (last N) **or** separate collection with TTL index |

**Embed vs reference (the only decision that matters):**

| Signal | Embed | Reference |
|---|---|---|
| Always read together with parent | ✅ | |
| Queried independently | | ✅ |
| Array bounded (< ~100, doesn't grow forever) | ✅ | |
| Array unbounded (logs, comments stream) | | ✅ |
| 1:1 or 1:few cardinality | ✅ | |
| Many-to-many | | ✅ |
| Data has no meaning without parent (address line on order) | ✅ | |
| Has its own lifecycle (user, product, order) | | ✅ |
| Need atomic update across parent + child | ✅ | |
| Document would exceed ~1 MB | | ✅ |
| Field changes often + is embedded in many docs | | ✅ |

**Denormalization trade-off rule:**

| Read:write ratio | Strategy |
|---|---|
| 100:1+ (typical CRUD list views) | Denormalize aggressively; sync on write |
| ~1:1 | Reference; do `$lookup` only on demand |
| Write-heavy (logs, events) | Reference + read-side aggregation pipeline |

**ObjectId structure:** 12 bytes = `4B timestamp` + `5B machine/process` + `3B counter`. Globally unique without coordination, sortable by creation time, no need for an auto-increment counter.

**Rule of thumb:** design around how the data is read, not how the entities relate. Embed what's read together, reference what's queried independently or grows unbounded. If you find yourself writing 3+ `$lookup`s in one pipeline, your schema is wrong. Duplication is a feature — as long as you own the write path that keeps it consistent.
