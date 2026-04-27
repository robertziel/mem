### MongoDB Indexing (Compound, Multikey, Text, TTL, Explain)

**Index types overview:**

| Type | Use case | Example |
|------|----------|---------|
| Single field | Simple equality/range queries | `{ email: 1 }` |
| Compound | Multi-field queries, sort | `{ status: 1, created_at: -1 }` |
| Multikey | Array fields | `{ tags: 1 }` (auto-detected) |
| Text | Full-text search | `{ title: "text", body: "text" }` |
| TTL | Auto-expire documents | `{ expires_at: 1 }, { expireAfterSeconds: 0 }` |
| Hashed | Hash-based sharding | `{ user_id: "hashed" }` |
| Geospatial (2dsphere) | Location queries | `{ location: "2dsphere" }` |
| Partial | Index subset of docs | `{ score: 1 }, { partialFilterExpression: { score: { $gt: 50 } } }` |
| Wildcard | Dynamic/unknown fields | `{ "metadata.$**": 1 }` |

**Single field index:**
```javascript
db.users.createIndex({ email: 1 })           // ascending
db.users.createIndex({ created_at: -1 })      // descending
db.users.createIndex({ email: 1 }, { unique: true })  // unique constraint
```

**Compound index (most important for production):**
```javascript
// ESR rule: Equality → Sort → Range
db.orders.createIndex({ status: 1, created_at: -1, total: 1 })

// This index supports these queries efficiently:
db.orders.find({ status: "completed" }).sort({ created_at: -1 })         // ✅ E + S
db.orders.find({ status: "completed", total: { $gte: 100 } })           // ✅ E + R
db.orders.find({ status: "completed" })                                   // ✅ prefix
db.orders.find({}).sort({ status: 1, created_at: -1 })                   // ✅ sort prefix

// Does NOT efficiently support:
db.orders.find({ total: { $gte: 100 } })                                 // ❌ no prefix
db.orders.find({ created_at: { $gte: ISODate("...") } })                // ❌ no prefix
db.orders.find({}).sort({ created_at: -1 })                              // ❌ skip status
```

**Index prefix rule:**
```javascript
// Compound index: { a: 1, b: 1, c: 1 }
// Supports queries on: {a}, {a,b}, {a,b,c}
// Does NOT support:    {b}, {c}, {b,c}
// Think of it like a phone book: sorted by last name, then first name
```

**Multikey index (arrays):**
```javascript
// Automatic for array fields
db.articles.createIndex({ tags: 1 })
db.articles.find({ tags: "mongodb" })       // finds docs where tags array contains "mongodb"
db.articles.find({ tags: { $all: ["mongodb", "ruby"] } })  // contains both

// Limitation: compound index can have at most ONE array field
db.collection.createIndex({ tags: 1, categories: 1 })  // ❌ if both are arrays
```

**Text index:**
```javascript
// One text index per collection
db.articles.createIndex(
  { title: "text", body: "text", tags: "text" },
  { weights: { title: 10, body: 5, tags: 3 }, default_language: "english" }
)

// Text search
db.articles.find({ $text: { $search: "mongodb aggregation" } })              // OR
db.articles.find({ $text: { $search: "\"mongodb aggregation\"" } })          // exact phrase
db.articles.find({ $text: { $search: "mongodb -mysql" } })                   // exclude
db.articles.find(
  { $text: { $search: "mongodb" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })  // sort by relevance
```

**TTL index (auto-delete expired documents):**
```javascript
// Delete documents 30 days after created_at
db.sessions.createIndex({ created_at: 1 }, { expireAfterSeconds: 2592000 })

// Delete at specific time (set expireAfterSeconds: 0, use the field as deadline)
db.tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
// Document: { token: "abc", expires_at: ISODate("2025-06-01T00:00:00Z") }

// TTL runs every 60 seconds — deletion is not instant
// Only works on single date fields, not compound indexes
```

**Partial index (index only matching documents):**
```javascript
// Index only active users — smaller index, faster queries on active users
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: "active" } }
)
// ✅ Uses index: db.users.find({ email: "jan@x.com", status: "active" })
// ❌ No index:  db.users.find({ email: "jan@x.com" })  // no status filter

// Sparse index — similar but only indexes docs where field exists
db.users.createIndex({ phone: 1 }, { sparse: true })
```

**Wildcard index (dynamic schemas):**
```javascript
// Index all fields under metadata (for flexible/polymorphic documents)
db.events.createIndex({ "metadata.$**": 1 })
db.events.find({ "metadata.source": "api" })       // ✅ uses wildcard index
db.events.find({ "metadata.user.country": "PL" })  // ✅ nested too

// Index all fields in entire document (use carefully — big index)
db.collection.createIndex({ "$**": 1 })
```

**Using explain() to analyze queries:**
```javascript
// Three verbosity levels
db.orders.find({ status: "completed" }).explain("queryPlanner")       // plan only
db.orders.find({ status: "completed" }).explain("executionStats")     // plan + stats ✅
db.orders.find({ status: "completed" }).explain("allPlansExecution")  // all candidates

// Key fields in executionStats:
{
  "executionStats": {
    "nReturned": 150,           // documents returned
    "totalKeysExamined": 150,   // index entries scanned
    "totalDocsExamined": 150,   // documents scanned
    "executionTimeMillis": 2,   // time in ms
  },
  "winningPlan": {
    "stage": "IXSCAN",          // ✅ using index (vs COLLSCAN ❌)
    "indexName": "status_1_created_at_-1"
  }
}

// What to look for:
// ✅ IXSCAN (index scan) — good
// ❌ COLLSCAN (collection scan) — full scan, needs index
// ✅ nReturned ≈ totalDocsExamined — efficient
// ❌ totalDocsExamined >> nReturned — scanning too many docs
// ❌ totalKeysExamined >> nReturned — index not selective enough
```

**Index management:**
```javascript
// List indexes
db.collection.getIndexes()

// Drop index
db.collection.dropIndex("index_name")
db.collection.dropIndex({ email: 1 })

// Build index in background (default in MongoDB 4.2+)
db.collection.createIndex({ field: 1 })  // non-blocking by default

// Hide index (test impact without dropping)
db.collection.hideIndex("index_name")    // planner ignores it
db.collection.unhideIndex("index_name")  // re-enable
```

**Index sizing and memory:**
```javascript
// Check index sizes
db.collection.stats().indexSizes
db.collection.totalIndexSize()

// Indexes should fit in RAM for best performance
// If indexes exceed RAM, MongoDB uses disk — significant slowdown
// Monitor with: db.serverStatus().wiredTiger.cache
```

**Rule of thumb:** Every query in production should use an index (no COLLSCAN). Follow ESR (Equality-Sort-Range) for compound indexes. Use explain("executionStats") to verify. Partial indexes save space when you only query subsets. Keep indexes in RAM — monitor sizes. TTL indexes for auto-cleanup of temporary data. One text index per collection. Hide before dropping to test safely.
