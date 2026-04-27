### MongoDB Data Modeling (Embedding vs Referencing, Schema Design)

**Core principle:** Model for your query patterns, not your entity relationships. MongoDB is NOT "SQL without JOINs" — design documents around how your app reads data.

**Embedding (denormalized) — subdocuments inside parent:**
```javascript
// GOOD: Address is always read with user, 1:1 or 1:few
{
  _id: ObjectId("..."),
  name: "Jan Kowalski",
  email: "jan@example.com",
  addresses: [
    { street: "Marszałkowska 1", city: "Warsaw", zip: "00-001" },
    { street: "Floriańska 5", city: "Kraków", zip: "31-019" }
  ],
  preferences: { theme: "dark", locale: "pl" }
}
```

**Referencing (normalized) — store ObjectId, query separately:**
```javascript
// GOOD: Comments are many, queried independently, grow unbounded
// users collection
{ _id: ObjectId("user1"), name: "Jan" }

// comments collection
{ _id: ObjectId("c1"), user_id: ObjectId("user1"), post_id: ObjectId("p1"),
  body: "Great article!", created_at: ISODate("2025-01-15") }
```

**When to embed vs reference:**

| Factor | Embed | Reference |
|--------|-------|-----------|
| Relationship | 1:1, 1:few (< ~100) | 1:many, many:many |
| Data growth | Bounded (won't grow forever) | Unbounded |
| Read pattern | Always read together | Queried independently |
| Update pattern | Rarely updated | Frequently updated |
| Document size | Stays under 16MB limit | Could exceed limit |
| Atomicity need | Need atomic update on parent+child | Independent lifecycle |

**Schema design patterns:**

**1. Subset pattern — embed only what you display:**
```javascript
// Product with top 10 reviews embedded, rest in separate collection
{
  _id: ObjectId("prod1"),
  name: "Wireless Headphones",
  price: 299.99,
  recent_reviews: [   // only last 10, for product listing page
    { user: "Jan", rating: 5, text: "Excellent!", date: ISODate("...") }
  ],
  review_count: 1847
}
// Full reviews in reviews collection for pagination
```

**2. Computed pattern — pre-compute aggregations:**
```javascript
{
  _id: ObjectId("prod1"),
  name: "Wireless Headphones",
  total_reviews: 1847,
  avg_rating: 4.3,          // pre-computed, updated on new review
  rating_breakdown: { 5: 900, 4: 500, 3: 200, 2: 100, 1: 147 }
}
```

**3. Bucket pattern — group time-series data:**
```javascript
// Instead of 1 doc per measurement (millions of docs)
// Group into buckets (e.g., 1 hour of readings per doc)
{
  sensor_id: "temp-01",
  bucket_start: ISODate("2025-01-15T10:00:00Z"),
  bucket_end: ISODate("2025-01-15T11:00:00Z"),
  count: 60,
  measurements: [
    { ts: ISODate("2025-01-15T10:00:00Z"), value: 22.1 },
    { ts: ISODate("2025-01-15T10:01:00Z"), value: 22.3 }
    // ... 60 entries per bucket
  ],
  avg: 22.4, min: 21.8, max: 23.1   // pre-aggregated
}
```

**4. Extended reference pattern — embed frequently needed fields:**
```javascript
// Order doesn't embed full customer, just what's needed for display
{
  _id: ObjectId("order1"),
  customer: {
    _id: ObjectId("cust1"),
    name: "Jan Kowalski",    // denormalized for display
    email: "jan@example.com" // denormalized for notifications
    // NOT the full customer document
  },
  items: [ { sku: "WH-100", name: "Headphones", qty: 1, price: 299.99 } ],
  total: 299.99
}
```

**5. Polymorphic pattern — different shapes in one collection:**
```javascript
// Single "events" collection with varying structure
{ type: "page_view", url: "/products/123", user_id: "u1", ts: ISODate("...") }
{ type: "purchase", order_id: "o1", amount: 99.99, user_id: "u1", ts: ISODate("...") }
{ type: "signup", user_id: "u1", referral: "google", ts: ISODate("...") }
// Query by type, index on { type: 1, ts: -1 }
```

**Anti-patterns to avoid:**

```javascript
// ❌ Unbounded arrays — will hit 16MB limit
{ user_id: "u1", followers: [ /* 500,000 ObjectIds */ ] }

// ✅ Reverse the reference
{ _id: "follow1", follower_id: "u2", following_id: "u1" }

// ❌ Deep nesting (> 3 levels) — hard to query and index
{ a: { b: { c: { d: { e: "too deep" } } } } }

// ❌ Massive documents — keep well under 16MB
// Split into multiple collections if document grows with usage

// ❌ Normalizing everything like SQL — defeats MongoDB's purpose
// If you always need user+address together, embed it
```

**Document size guidelines:**
- Hard limit: 16MB per document
- Practical target: keep documents under 1MB for good performance
- Embedded arrays: ideally < 100 elements, never unbounded
- If array grows with usage → use a separate collection

**Rule of thumb:** Embed data you read together. Reference data you query independently or that grows unbounded. Design for your most common query, not for entity purity. When in doubt, ask "will this array grow forever?" — if yes, reference it. Pre-compute values you display often. Accept some data duplication — storage is cheap, JOINs across collections are expensive.
