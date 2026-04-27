### CTEs (Common Table Expressions)

**Basic CTE (WITH clause):**
```sql
WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE active = true AND last_login > NOW() - INTERVAL '30 days'
)
SELECT au.name, COUNT(o.id) AS order_count
FROM active_users au
JOIN orders o ON o.user_id = au.id
GROUP BY au.name
ORDER BY order_count DESC;
```
- Named temporary result set within a single query
- Improves readability (name complex subqueries)
- Scope: only exists for the duration of the query

**Multiple CTEs:**
```sql
WITH
  recent_orders AS (
    SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'
  ),
  top_customers AS (
    SELECT user_id, SUM(total) AS week_total
    FROM recent_orders
    GROUP BY user_id
    HAVING SUM(total) > 500
  )
SELECT u.name, tc.week_total
FROM top_customers tc
JOIN users u ON u.id = tc.user_id;
```

**Recursive CTE (tree/graph traversal):**
```sql
-- Employee hierarchy (manager → reports)
WITH RECURSIVE org_chart AS (
  -- Base case: CEO (no manager)
  SELECT id, name, manager_id, 1 AS depth
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: find reports of each level
  SELECT e.id, e.name, e.manager_id, oc.depth + 1
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT name, depth FROM org_chart ORDER BY depth, name;
```

**Recursive CTE for path finding:**
```sql
-- Category breadcrumb (child → parent chain)
WITH RECURSIVE breadcrumb AS (
  SELECT id, name, parent_id, name::text AS path
  FROM categories
  WHERE id = 42  -- start from a specific category

  UNION ALL

  SELECT c.id, c.name, c.parent_id, c.name || ' > ' || b.path
  FROM categories c
  JOIN breadcrumb b ON c.id = b.parent_id
)
SELECT path FROM breadcrumb WHERE parent_id IS NULL;
-- "Electronics > Computers > Laptops > Gaming Laptops"
```

**CTE vs subquery vs temp table:**
| Feature | CTE | Subquery | Temp table |
|---------|-----|----------|-----------|
| Readability | Best (named) | Inline (nested) | Separate statement |
| Reusable in query | Yes (reference by name) | No (duplicate) | Yes |
| Recursive | Yes | No | No |
| Materialized | Depends on optimizer | Depends | Always materialized |
| Scope | Single query | Single query | Session |

**PostgreSQL: materialized vs not:**
```sql
-- Force materialization (compute once, reuse)
WITH active AS MATERIALIZED (
  SELECT * FROM users WHERE active = true
)
SELECT * FROM active WHERE ...;

-- Let optimizer decide (default, usually fine)
WITH active AS NOT MATERIALIZED (
  SELECT * FROM users WHERE active = true
)
SELECT * FROM active WHERE ...;
```

**Rule of thumb:** CTEs for readability (name your subqueries). Recursive CTEs for tree structures (org charts, categories, BOM). Multiple CTEs to build up complex queries step by step. PostgreSQL materializes CTEs by default in older versions — use `NOT MATERIALIZED` if the optimizer needs to push predicates down.
