### MongoDB Aggregation Pipeline (Stages, Operators, Optimization)

**Aggregation pipeline** processes documents through a sequence of stages. Each stage transforms the documents and passes results to the next stage.

**Core stages:**

```javascript
db.orders.aggregate([
  // $match — filter early (uses indexes, reduces data for next stages)
  { $match: { status: "completed", created_at: { $gte: ISODate("2025-01-01") } } },

  // $project — reshape, include/exclude fields, add computed fields
  { $project: { customer_id: 1, total: 1, month: { $month: "$created_at" } } },

  // $group — aggregate values (like SQL GROUP BY)
  { $group: {
    _id: { customer: "$customer_id", month: "$month" },
    total_spent: { $sum: "$total" },
    order_count: { $sum: 1 },
    avg_order: { $avg: "$total" },
    max_order: { $max: "$total" }
  }},

  // $sort — order results
  { $sort: { total_spent: -1 } },

  // $limit / $skip — pagination
  { $skip: 0 },
  { $limit: 20 }
])
```

**$lookup — LEFT OUTER JOIN across collections:**
```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $lookup: {
    from: "customers",          // collection to join
    localField: "customer_id",  // field in orders
    foreignField: "_id",        // field in customers
    as: "customer"              // output array field
  }},
  { $unwind: "$customer" },     // flatten array to object (since 1:1)
  { $project: {
    order_id: "$_id",
    total: 1,
    customer_name: "$customer.name",
    customer_email: "$customer.email"
  }}
])

// Correlated subquery $lookup (more flexible, like subquery)
{ $lookup: {
  from: "inventory",
  let: { sku: "$item_sku", order_date: "$created_at" },
  pipeline: [
    { $match: { $expr: {
      $and: [
        { $eq: ["$sku", "$$sku"] },
        { $gte: ["$stock_date", "$$order_date"] }
      ]
    }}},
    { $limit: 1 }
  ],
  as: "stock_at_order"
}}
```

**$unwind — deconstruct arrays:**
```javascript
// Document: { _id: 1, tags: ["ruby", "rails", "mongodb"] }
{ $unwind: "$tags" }
// Produces 3 documents:
// { _id: 1, tags: "ruby" }
// { _id: 1, tags: "rails" }
// { _id: 1, tags: "mongodb" }

// Preserve documents with empty/missing arrays
{ $unwind: { path: "$tags", preserveNullAndEmptyArrays: true } }
```

**$addFields / $set — add or overwrite fields:**
```javascript
{ $addFields: {
  total_with_tax: { $multiply: ["$total", 1.23] },  // 23% VAT
  full_name: { $concat: ["$first_name", " ", "$last_name"] },
  is_vip: { $gte: ["$lifetime_value", 10000] }
}}
```

**$facet — multiple pipelines in one pass:**
```javascript
// Run multiple aggregations on the same data simultaneously
db.products.aggregate([
  { $match: { active: true } },
  { $facet: {
    // Pipeline 1: price ranges
    price_ranges: [
      { $bucket: {
        groupBy: "$price",
        boundaries: [0, 50, 100, 500, Infinity],
        default: "other",
        output: { count: { $sum: 1 } }
      }}
    ],
    // Pipeline 2: top categories
    top_categories: [
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ],
    // Pipeline 3: overall stats
    stats: [
      { $group: {
        _id: null,
        avg_price: { $avg: "$price" },
        total: { $sum: 1 }
      }}
    ]
  }}
])
```

**$graphLookup — recursive/tree traversal:**
```javascript
// Find all reports (direct and indirect) of a manager
db.employees.aggregate([
  { $match: { name: "CEO" } },
  { $graphLookup: {
    from: "employees",
    startWith: "$_id",
    connectFromField: "_id",
    connectToField: "manager_id",
    as: "all_reports",
    maxDepth: 5,              // limit recursion depth
    depthField: "level"       // adds depth info to results
  }}
])
```

**Useful expression operators:**
```javascript
// Conditional
{ $cond: { if: { $gte: ["$total", 100] }, then: "big", else: "small" } }
{ $switch: { branches: [
  { case: { $gte: ["$score", 90] }, then: "A" },
  { case: { $gte: ["$score", 80] }, then: "B" }
], default: "C" }}

// Array operators
{ $size: "$items" }                           // array length
{ $filter: { input: "$items", cond: { $gte: ["$$this.qty", 5] } } }
{ $arrayElemAt: ["$scores", 0] }             // first element
{ $slice: ["$recent_orders", -5] }           // last 5

// Date operators
{ $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }
{ $dateDiff: { startDate: "$start", endDate: "$end", unit: "day" } }

// String operators
{ $regexMatch: { input: "$email", regex: /@company\.com$/ } }
{ $toUpper: "$status" }
{ $trim: { input: "$name" } }
```

**Optimization tips:**

```javascript
// ✅ 1. $match early — filter before processing (uses indexes)
[{ $match: { status: "active" } }, { $group: ... }]    // ✅
[{ $group: ... }, { $match: { status: "active" } }]    // ❌ scans all

// ✅ 2. $project early — drop unneeded fields to reduce memory
[{ $match: ... }, { $project: { name: 1, total: 1 } }, { $group: ... }]

// ✅ 3. Use indexes — $match and $sort at start can use indexes
// Create index: db.orders.createIndex({ status: 1, created_at: -1 })
[{ $match: { status: "completed" } }, { $sort: { created_at: -1 } }]

// ✅ 4. $limit early when possible
[{ $sort: { score: -1 } }, { $limit: 10 }, { $lookup: ... }]  // ✅ lookup only 10
[{ $sort: { score: -1 } }, { $lookup: ... }, { $limit: 10 }]  // ❌ lookup all then limit

// ✅ 5. Avoid $unwind on large arrays if possible — use array operators instead
// Instead of $unwind + $group to sum array values:
{ $addFields: { total: { $sum: "$items.price" } } }  // no $unwind needed

// ✅ 6. allowDiskUse for large aggregations (default 100MB RAM limit)
db.huge_collection.aggregate([...], { allowDiskUse: true })

// ✅ 7. Use explain to analyze pipeline
db.orders.explain("executionStats").aggregate([...])
```

**Pipeline vs Map-Reduce:** Aggregation pipeline is preferred — faster, more readable, and actively developed. Map-Reduce is deprecated since MongoDB 5.0.

**Rule of thumb:** Filter ($match) and sort ($sort) as early as possible — they can use indexes. Project away unneeded fields early. Use $facet for dashboards needing multiple aggregations. Prefer array operators over $unwind when possible. Use allowDiskUse for pipelines on large collections. Always explain() your aggregations in production.
