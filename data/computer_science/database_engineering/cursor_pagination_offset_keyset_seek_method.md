### Database Cursors & Pagination Methods

**SQL Cursor (server-side):**
```sql
BEGIN;
DECLARE order_cursor CURSOR FOR
  SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at;

FETCH NEXT 100 FROM order_cursor;   -- get 100 rows
FETCH NEXT 100 FROM order_cursor;   -- get next 100
-- ... process in batches

CLOSE order_cursor;
COMMIT;
```
- Holds a position in the result set on the server
- Use for: batch processing large result sets without loading all into memory
- Downside: holds a transaction open, consumes server resources

**Offset pagination (simple but flawed):**
```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 40;
-- Page 3, 20 items per page
```
| Problem | Why |
|---------|-----|
| Slow on large offsets | `OFFSET 100000` scans and discards 100K rows |
| Inconsistent with concurrent inserts | New rows shift pages — skip or duplicate items |
| No stable position | Page 5 today ≠ page 5 after inserts |

**Keyset pagination (cursor-based, recommended):**
```sql
-- First page
SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 20;

-- Next page: "give me items after the last item I saw"
SELECT * FROM orders
WHERE (created_at, id) < ('2024-01-15 10:30:00', 500)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

**Why keyset is better:**
| Feature | Offset | Keyset |
|---------|--------|--------|
| Performance | O(offset + limit) — degrades | O(limit) — constant |
| Consistency | Skips/duplicates with concurrent writes | Stable (position defined by values) |
| Random page access | Yes (`?page=50`) | No (must traverse sequentially) |
| Implementation | Simple | More complex (encode/decode cursor) |

**API cursor implementation:**
```ruby
# Encode cursor (Base64 of last item's sort values)
cursor = Base64.urlsafe_encode64({ created_at: last.created_at.iso8601, id: last.id }.to_json)
# "eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0xNVQxMDozMDowMFoiLCJpZCI6NTAwfQ"

# Decode cursor
decoded = JSON.parse(Base64.urlsafe_decode64(params[:cursor]))
orders = Order.where("(created_at, id) < (?, ?)", decoded["created_at"], decoded["id"])
              .order(created_at: :desc, id: :desc)
              .limit(20)
```

**Rails batch processing (find_each / find_in_batches):**
```ruby
# Uses keyset pagination internally (ORDER BY id, WHERE id > last_id)
User.where(active: true).find_each(batch_size: 1000) do |user|
  # process one user at a time, loaded in batches of 1000
end

User.where(active: true).find_in_batches(batch_size: 1000) do |batch|
  # process array of 1000 users at a time
end
```

**Rule of thumb:** Keyset (cursor) pagination for APIs and infinite scroll (fast, consistent). Offset only for admin panels where random page access is needed and data is small. Rails `find_each` for batch processing (uses keyset internally). Always include a tiebreaker column (id) in the ORDER BY for deterministic pagination.
