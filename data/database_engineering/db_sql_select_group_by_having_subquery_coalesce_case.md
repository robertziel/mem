### SQL Fundamentals (SELECT, GROUP BY, Subqueries)

**SELECT basics:**
```sql
SELECT name, email, created_at
FROM users
WHERE active = true AND role IN ('admin', 'editor')
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;
```

**GROUP BY + aggregate functions:**
```sql
SELECT department, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
WHERE active = true
GROUP BY department
HAVING COUNT(*) > 5          -- filter AFTER grouping (not WHERE)
ORDER BY avg_salary DESC;
```

**WHERE vs HAVING:**
- `WHERE` filters rows BEFORE grouping
- `HAVING` filters groups AFTER grouping

**CASE (conditional logic):**
```sql
SELECT name, salary,
  CASE
    WHEN salary > 150000 THEN 'senior'
    WHEN salary > 100000 THEN 'mid'
    ELSE 'junior'
  END AS level
FROM employees;
```

**COALESCE / NULLIF:**
```sql
-- COALESCE: first non-null value
SELECT COALESCE(nickname, name, 'Anonymous') AS display_name FROM users;

-- NULLIF: return NULL if values are equal
SELECT NULLIF(discount, 0) FROM orders;  -- avoids division by zero
SELECT total / NULLIF(quantity, 0) AS unit_price FROM orders;
```

**Subqueries:**
```sql
-- Scalar subquery (returns one value)
SELECT name, salary,
  salary - (SELECT AVG(salary) FROM employees) AS diff_from_avg
FROM employees;

-- IN subquery
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);

-- EXISTS (often faster than IN)
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.total > 1000);

-- Correlated subquery (references outer query)
SELECT name, salary,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = e.id) AS order_count
FROM employees e;
```

**DISTINCT and DISTINCT ON (PostgreSQL):**
```sql
SELECT DISTINCT department FROM employees;

-- DISTINCT ON: first row per group (PostgreSQL-specific)
SELECT DISTINCT ON (user_id) user_id, created_at, total
FROM orders
ORDER BY user_id, created_at DESC;
-- Returns latest order per user
```

**UNION / INTERSECT / EXCEPT:**
```sql
SELECT email FROM customers
UNION ALL                      -- combine (keep duplicates)
SELECT email FROM newsletter_subscribers;

SELECT email FROM customers
UNION                          -- combine (remove duplicates)
SELECT email FROM newsletter_subscribers;

SELECT email FROM customers
EXCEPT                         -- in customers but NOT in unsubscribed
SELECT email FROM unsubscribed;
```

**Rule of thumb:** Use WHERE for row-level filtering, HAVING for group-level filtering. COALESCE for null handling. EXISTS over IN for correlated checks (usually faster). DISTINCT ON for "latest per group" in PostgreSQL. CASE for conditional columns.
