### MongoDB vs Relational Modeling Pitfalls (Avoiding 1:1 SQL Mapping)

**The #1 mistake:** Treating MongoDB like SQL with JSON syntax — normalizing everything into separate collections and doing `$lookup` everywhere.

**SQL thinking vs MongoDB thinking:**

```
SQL mindset (wrong for MongoDB):
┌──────────┐    ┌──────────────┐    ┌──────────┐
│  users   │───>│ user_profiles │───>│ addresses│
└──────────┘    └──────────────┘    └──────────┘
     │
     └──>┌──────────────────┐
         │ user_preferences │
         └──────────────────┘

MongoDB mindset (design for queries):
┌────────────────────────────────────────┐
│  users                                  │
│  { name, email, profile: {...},         │
│    addresses: [...], preferences: {...} }│
└────────────────────────────────────────┘
```

**Pitfall 1: Normalizing everything into separate collections**
```javascript
// ❌ SQL habit: separate collection for every "table"
// users, user_profiles, user_settings, user_addresses
// Now every read needs 4 queries or $lookups

// ✅ MongoDB way: embed what you read together
{
  _id: ObjectId("..."),
  name: "Jan Kowalski",
  email: "jan@example.com",
  profile: { bio: "Ruby developer", avatar_url: "..." },
  settings: { theme: "dark", notifications: true },
  addresses: [
    { label: "home", city: "Warsaw", street: "..." },
    { label: "work", city: "Kraków", street: "..." }
  ]
}
// One read to get everything for user profile page
```

**Pitfall 2: Using $lookup as a substitute for JOIN**
```javascript
// ❌ Using $lookup everywhere like SQL JOINs
db.orders.aggregate([
  { $lookup: { from: "users", ... } },
  { $lookup: { from: "products", ... } },
  { $lookup: { from: "shipping", ... } },
  { $lookup: { from: "payments", ... } }
])
// Slow, defeats purpose of document DB — each $lookup is basically a JOIN

// ✅ Denormalize what you need at write time
{
  _id: ObjectId("order1"),
  customer: { _id: ObjectId("u1"), name: "Jan", email: "jan@x.com" },
  items: [
    { product_id: ObjectId("p1"), name: "Widget", price: 29.99, qty: 2 }
  ],
  shipping: { method: "express", address: { city: "Warsaw", ... } },
  payment: { method: "card", last4: "4242", status: "captured" }
}
// One read for order details page — no lookups needed
```

**Pitfall 3: Foreign keys and referential integrity expectations**
```javascript
// ❌ Expecting MongoDB to enforce FK constraints
{ order_id: ObjectId("..."), user_id: ObjectId("...") }
// MongoDB won't prevent user_id pointing to a deleted user

// ✅ Handle in application layer
class Order
  include Mongoid::Document
  belongs_to :user
  validates :user, presence: true  # validate on write

  # For critical references, embed a snapshot
  field :customer_snapshot, type: Hash  # { name: "Jan", email: "..." }
  before_create { self.customer_snapshot = user.slice(:name, :email) }
end
```

**Pitfall 4: Deeply nested structures to avoid "multiple collections"**
```javascript
// ❌ Over-embedding: putting everything in one document
{
  company: "Acme",
  departments: [{
    name: "Engineering",
    teams: [{
      name: "Backend",
      members: [{
        name: "Jan",
        tasks: [{
          title: "Fix bug",
          comments: [{
            author: "Anna",
            replies: [{ ... }]  // 5+ levels deep
          }]
        }]
      }]
    }]
  }]
}
// Hard to query, hard to update, will hit 16MB limit

// ✅ Separate collections for independently queried entities
// companies, departments, teams, members — each their own collection
// Embed only what's always read together (e.g., address in company)
```

**Pitfall 5: Not denormalizing for read performance**
```javascript
// ❌ Storing only IDs, requiring multiple queries to display a list
// posts collection
{ _id: "p1", title: "MongoDB Tips", author_id: "u1", category_id: "c1" }
// To display a post list, you need 3 queries: posts + users + categories

// ✅ Denormalize frequently displayed fields
{
  _id: "p1",
  title: "MongoDB Tips",
  author: { _id: "u1", name: "Jan", avatar: "..." },
  category: { _id: "c1", name: "Database", slug: "database" }
}
// Trade-off: update author name in posts when user changes name
// Usually worth it — reads vastly outnumber writes
```

**Pitfall 6: Applying normalization forms (1NF, 2NF, 3NF)**
```javascript
// ❌ SQL normalization: avoid data duplication at all costs
// separate: users, roles, user_roles (join table)

// ✅ MongoDB: duplication is OK when it serves your queries
// User document with roles embedded
{ _id: "u1", name: "Jan", roles: ["admin", "editor"] }

// If you need to query "all admins":
db.users.find({ roles: "admin" })  // multikey index on roles array
// No join table needed
```

**Pitfall 7: Using auto-increment IDs**
```javascript
// ❌ Trying to replicate SQL auto-increment IDs
// Requires a counter collection + findAndModify — slow, contention point

// ✅ Use ObjectId (default) — globally unique, contains timestamp
// ObjectId("507f1f77bcf86cd799439011")
//   ├── 4 bytes: timestamp (seconds since epoch)
//   ├── 5 bytes: random value (machine + process unique)
//   └── 3 bytes: incrementing counter

// If you need human-readable IDs, use a separate field
{ _id: ObjectId("..."), order_number: "ORD-2025-0001" }
```

**Pitfall 8: Ignoring document growth**
```javascript
// ❌ Embedding arrays that grow unbounded
{
  user_id: "u1",
  activity_log: [
    // This array will grow forever — hits 16MB, degrades performance
    { action: "login", ts: ISODate("...") },
    // ... millions of entries
  ]
}

// ✅ Bounded arrays OR separate collection
// Option A: Keep only last N entries
{ user_id: "u1", recent_activity: [ /* last 50 entries */ ] }

// Option B: Separate collection with TTL
// activity_logs collection
{ user_id: "u1", action: "login", ts: ISODate("...") }
// TTL index to auto-delete old entries
```

**When to use references (separate collections):**
- Entity has its own lifecycle (users, products, orders)
- Data is queried independently from parent
- Many-to-many relationships
- Array would grow unbounded
- Document would exceed practical size (> 1MB)
- Data changes frequently and is embedded in many places

**When to embed (subdocuments):**
- Data is always read with parent (profile in user)
- One-to-one or one-to-few relationships
- Data has no meaning without parent
- You need atomic updates on parent + child
- Bounded array (< ~100 elements)

**Decision flowchart:**
```
Will this data be queried independently?
  YES → separate collection (reference)
  NO  → Will this array grow unbounded?
          YES → separate collection
          NO  → Is this 1:1 or 1:few?
                  YES → embed
                  NO  → separate collection
```

**Rule of thumb:** MongoDB rewards you for designing around query patterns, not entity relationships. Denormalize for reads, accept some write overhead. If you find yourself doing 3+ `$lookup`s in an aggregation, your schema probably needs redesign. Embed what you read together, reference what you query independently. Data duplication is a feature, not a bug — as long as you manage updates.
