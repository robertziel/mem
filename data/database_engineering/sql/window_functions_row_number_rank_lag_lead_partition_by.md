### SQL Window Functions

**What window functions do:**
- Perform calculations across a set of rows related to the current row
- Unlike GROUP BY: don't collapse rows — every row keeps its identity
- Syntax: `function() OVER (PARTITION BY ... ORDER BY ...)`

**ROW_NUMBER, RANK, DENSE_RANK:**
```sql
SELECT name, department, salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
  RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank,
  DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank
FROM employees;

-- Result (Engineering dept):
-- name    | salary | row_num | rank | dense_rank
-- Alice   | 150000 |    1    |   1  |     1
-- Bob     | 150000 |    2    |   1  |     1      ← same salary
-- Carol   | 120000 |    3    |   3  |     2      ← rank skips 2, dense_rank doesn't
```

| Function | Ties | Gaps | Use for |
|----------|------|------|---------|
| ROW_NUMBER | Arbitrary tiebreak | No | Unique numbering, pagination |
| RANK | Same rank for ties | Yes (skips) | Competition ranking |
| DENSE_RANK | Same rank for ties | No | Top-N without gaps |

**LAG / LEAD (access previous/next row):**
```sql
SELECT date, revenue,
  LAG(revenue, 1) OVER (ORDER BY date) AS prev_day_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY date) AS day_over_day_change,
  LEAD(revenue, 1) OVER (ORDER BY date) AS next_day_revenue
FROM daily_stats;
```

**Running totals and aggregates:**
```sql
SELECT date, amount,
  SUM(amount) OVER (ORDER BY date) AS running_total,
  AVG(amount) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7day,
  COUNT(*) OVER () AS total_rows
FROM transactions;
```

**PARTITION BY (group without collapsing):**
```sql
-- Top 3 highest-paid employees per department
SELECT * FROM (
  SELECT name, department, salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
) ranked
WHERE rn <= 3;
```

**FIRST_VALUE / LAST_VALUE / NTH_VALUE:**
```sql
SELECT name, department, salary,
  FIRST_VALUE(name) OVER (PARTITION BY department ORDER BY salary DESC) AS highest_paid,
  LAST_VALUE(name) OVER (
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_paid
FROM employees;
```

**Common interview patterns:**
```sql
-- Find duplicates (keep first, delete rest)
DELETE FROM users WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
    FROM users
  ) t WHERE rn > 1
);

-- Cumulative percentage
SELECT product, revenue,
  SUM(revenue) OVER (ORDER BY revenue DESC) * 100.0 / SUM(revenue) OVER () AS cumulative_pct
FROM products;
```

**Rule of thumb:** Window functions = GROUP BY without collapsing rows. ROW_NUMBER for unique numbering, RANK/DENSE_RANK for competition-style ranking. LAG/LEAD for comparing with previous/next rows. Always specify PARTITION BY and ORDER BY explicitly.
