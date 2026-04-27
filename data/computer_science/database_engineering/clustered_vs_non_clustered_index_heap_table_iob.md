### Clustered vs Non-Clustered Index

**Non-clustered index (how PostgreSQL works):**
```
Index (B-tree):       [key → pointer to heap page]
  10 → page 5, row 3
  20 → page 2, row 7
  30 → page 8, row 1

Heap table (unordered):
  Page 2: [..., row 7 (id=20), ...]
  Page 5: [..., row 3 (id=10), ...]
  Page 8: [row 1 (id=30), ...]

Lookup: index finds row pointer → jump to heap page → read row
```
- Data stored in **heap** (insertion order, unordered)
- Index is a separate structure pointing to heap locations
- Multiple non-clustered indexes per table

**Clustered index (how MySQL InnoDB works):**
```
Primary key IS the table (index-organized table):
  B-tree leaf pages contain the ACTUAL DATA

  [10 → {name: 'Alice', email: 'a@b.com'}]
  [20 → {name: 'Bob', email: 'b@b.com'}]
  [30 → {name: 'Carol', email: 'c@c.com'}]

Lookup by PK: traverse B-tree → data is right there (no extra hop)
Secondary index: [email → primary key] → then PK lookup for data
```

**Key differences:**
| Feature | Clustered (MySQL InnoDB) | Non-clustered (PostgreSQL) |
|---------|------------------------|--------------------------|
| Data storage | Sorted by PK in B-tree | Heap (unordered) |
| PK lookup | Single B-tree traversal | Index + heap fetch |
| Secondary index lookup | Index → PK → data (double lookup) | Index → heap (single hop) |
| Insert performance | Must maintain sorted order | Append to heap (fast) |
| Range scan on PK | Very fast (data physically ordered) | Slower (random heap access) |
| Tables per table | One clustered index | Multiple non-clustered |

**PostgreSQL CLUSTER command (one-time physical reorder):**
```sql
-- Physically reorder table rows to match index order (one-time)
CLUSTER users USING idx_users_created_at;
-- Table is now physically sorted by created_at (faster range scans)
-- BUT: not maintained on subsequent inserts (one-time operation)
-- Requires ACCESS EXCLUSIVE lock (blocks everything)
```

**Index-Only Scan (covering index) — PostgreSQL's alternative:**
```sql
-- Instead of clustering, create a covering index
CREATE INDEX idx_orders_user_total ON orders (user_id) INCLUDE (total);

-- This query served entirely from index (no heap access)
SELECT total FROM orders WHERE user_id = 123;
-- → Index Only Scan (fast, regardless of heap order)
```

**Rule of thumb:** PostgreSQL uses heap tables + non-clustered indexes (no true clustered index). MySQL InnoDB uses clustered index on primary key. In PostgreSQL, use covering indexes (INCLUDE) for index-only scans instead of relying on physical ordering. CLUSTER is a one-time operation — not a substitute for proper indexing.
