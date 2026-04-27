### SQL Joins

**Join types visual:**
```
Table A: [1, 2, 3, 4]     Table B: [3, 4, 5, 6]

INNER JOIN:       [3, 4]           ← only matching rows
LEFT JOIN:        [1, 2, 3, 4]     ← all from A + matching from B
RIGHT JOIN:       [3, 4, 5, 6]     ← all from B + matching from A
FULL OUTER JOIN:  [1, 2, 3, 4, 5, 6] ← all from both
CROSS JOIN:       [1×3, 1×4, 1×5, ... 4×6]  ← every combination (cartesian)
```

**INNER JOIN (most common):**
```sql
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
-- Only users who have orders
```

**LEFT JOIN (keep all from left table):**
```sql
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
-- All users, NULL for those without orders

-- Find users WITHOUT orders (anti-join):
SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;
```

**RIGHT JOIN:**
```sql
-- Same as LEFT JOIN but keeps all from right table
-- Rarely used — just swap table order and use LEFT JOIN instead
```

**FULL OUTER JOIN:**
```sql
SELECT u.name, o.total
FROM users u
FULL OUTER JOIN orders o ON o.user_id = u.id;
-- All users + all orders, NULLs where no match on either side
```

**CROSS JOIN (cartesian product):**
```sql
SELECT s.size, c.color
FROM sizes s
CROSS JOIN colors c;
-- Every size × every color combination
-- Use for: generating combinations, date series × categories
```

**Self-join:**
```sql
-- Employees with their managers (same table)
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**Multiple joins:**
```sql
SELECT u.name, o.id, p.name AS product
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN line_items li ON li.order_id = o.id
JOIN products p ON p.id = li.product_id
WHERE o.status = 'completed';
```

**JOIN performance tips:**
- Index the join columns (foreign keys)
- JOIN is usually faster than subquery (optimizer can choose best plan)
- Avoid joining on functions: `ON LOWER(a.email) = LOWER(b.email)` — can't use index

**Rule of thumb:** INNER JOIN when you only want matches. LEFT JOIN when you want all from one side (find orphans with `WHERE right.id IS NULL`). Avoid RIGHT JOIN (swap tables, use LEFT). Index all foreign key columns used in JOINs.
