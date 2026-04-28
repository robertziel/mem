### SQL Analytics — Window Functions (running total, top-N per group, LAG/LEAD, partition)

**When:** analytics queries that need **per-row computations using surrounding rows** — running totals, rankings, percentiles, period-over-period diffs, top-N per group, sessionization. Window functions replace self-joins and complex subqueries with cleaner, faster SQL.

**Schema:**

```
function() OVER (
    [PARTITION BY ...]      -- group rows
    [ORDER BY ...]          -- order within group
    [ROWS|RANGE BETWEEN ... AND ...]  -- frame bounds
)
```

| Component | Detail |
|---|---|
| `PARTITION BY` | Groups rows; like GROUP BY but doesn't collapse |
| `ORDER BY` | Sort within partition |
| Frame | Subset of partition for aggregation |

#### Window function categories

| Category | Functions |
|---|---|
| **Aggregate** | `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`, `STRING_AGG` |
| **Ranking** | `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE`, `PERCENT_RANK`, `CUME_DIST` |
| **Value** | `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE`, `NTH_VALUE` |

#### Common patterns

##### Running total

```sql
SELECT
    user_id, order_date, amount,
    SUM(amount) OVER (
        PARTITION BY user_id ORDER BY order_date
        ROWS UNBOUNDED PRECEDING
    ) AS lifetime_spend
FROM orders;
```

##### Rolling 7-day average

```sql
SELECT
    user_id, date, daily_revenue,
    AVG(daily_revenue) OVER (
        PARTITION BY user_id ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7d_avg
FROM daily_metrics;
```

##### Top-N per group

```sql
SELECT *
FROM (
    SELECT category, product_id, sales,
        ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) AS rn
    FROM product_sales
) t
WHERE rn <= 3;
```

##### Period-over-period (LAG)

```sql
SELECT
    month, revenue,
    LAG(revenue, 1) OVER (ORDER BY month) AS prev_month,
    revenue - LAG(revenue, 1) OVER (ORDER BY month) AS mom_change,
    (revenue - LAG(revenue, 12) OVER (ORDER BY month))
        / LAG(revenue, 12) OVER (ORDER BY month) AS yoy_change
FROM monthly_revenue;
```

##### First / last per group

```sql
SELECT DISTINCT
    user_id,
    FIRST_VALUE(action) OVER (PARTITION BY user_id ORDER BY ts) AS first_action,
    LAST_VALUE(action) OVER (
        PARTITION BY user_id ORDER BY ts
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_action
FROM events;
```

> **`LAST_VALUE` requires explicit frame** — default frame stops at current row.

##### Percentiles per group

```sql
SELECT
    region,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) OVER (PARTITION BY region) AS median,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY salary) OVER (PARTITION BY region) AS p90
FROM employees;
```

##### NTILE (quartiles, deciles)

```sql
SELECT
    user_id, lifetime_value,
    NTILE(10) OVER (ORDER BY lifetime_value DESC) AS decile
FROM users;
```

#### Ranking — three flavors

| Function | Behavior on ties |
|---|---|
| `ROW_NUMBER()` | Arbitrary unique numbers (1, 2, 3, 4) |
| `RANK()` | Equal rank, gaps in next (1, 1, 3, 4) |
| `DENSE_RANK()` | Equal rank, no gaps (1, 1, 2, 3) |

#### Frame specifications

| Frame | Meaning |
|---|---|
| `ROWS UNBOUNDED PRECEDING` | All previous rows + current |
| `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` | Last 7 rows (rolling 7) |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | 3-row centered |
| `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING` | Current + future |
| `RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW` | Time-based window |

> **`ROWS` counts physical rows; `RANGE` uses ORDER BY value.** `RANGE` better for time series with gaps.

#### `QUALIFY` (cleanest top-N)

```sql
-- Snowflake / BigQuery / DuckDB
SELECT *
FROM product_sales
QUALIFY ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) <= 3;
```

> No subquery needed. Use where supported (Snowflake, BigQuery, Teradata, DuckDB).

#### Sessionization (gap-filling sessions)

```sql
SELECT
    user_id, ts,
    SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY ts) AS session_id
FROM (
    SELECT user_id, ts,
        CASE WHEN ts - LAG(ts) OVER (PARTITION BY user_id ORDER BY ts)
                 > INTERVAL '30' MINUTE THEN 1 ELSE 0 END AS is_new_session
    FROM events
);
```

> Standard idiom: session ID = **running sum of "new session" flags**.

#### Common analytics patterns

| Pattern | Window technique |
|---|---|
| Running total | `SUM(...) OVER (ORDER BY ...)` |
| Cumulative count | `COUNT(*) OVER (ORDER BY ...)` |
| Rolling average | `AVG(...) OVER (ROWS BETWEEN N PRECEDING ...)` |
| Top-N per group | `ROW_NUMBER` + filter, or `QUALIFY` |
| Days since prev event | `LAG(ts) OVER (PARTITION BY user)` |
| Period-over-period change | `LAG`/`LEAD` for diff |
| First / last touch | `FIRST_VALUE` / `LAST_VALUE` (with frame) |
| Percentile per group | `PERCENTILE_CONT WITHIN GROUP` |
| Sessionization | `LAG` + running sum of session flag |
| Lookahead | `LEAD(...) OVER (PARTITION BY user ORDER BY ts)` |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| `LAST_VALUE` without frame | Default stops at current row; use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` |
| `ROW_NUMBER` ties broken arbitrarily | Add tie-breaker columns to `ORDER BY` |
| Filter `WHERE` before window | `WHERE` runs before windowing; use `QUALIFY` or subquery |
| `RANGE` vs `ROWS` confusion | `ROWS` counts rows; `RANGE` uses ORDER BY values |
| `RANK()` skipping numbers | Use `DENSE_RANK()` for "rank without gaps" |
| Recomputing window in many SELECTs | Use `WINDOW` clause to share definition |
| Mixing `PARTITION BY` with `GROUP BY` confusion | `PARTITION BY` keeps row count; `GROUP BY` collapses |

#### Compatibility

| Database | Support |
|---|---|
| **PostgreSQL, MySQL 8+, SQL Server, Snowflake, BigQuery, DuckDB** | Full |
| Snowflake / BigQuery / DuckDB / Teradata | Adds `QUALIFY` |
| Older MySQL (< 8) / SQLite (< 3.25) | Limited or no support |

**Rule of thumb:** **window functions = per-row computation using row context**. Use **`ROW_NUMBER` with `QUALIFY`** for top-N, **`LAG / LEAD`** for period comparisons, **`SUM ... ROWS BETWEEN`** for rolling. Always specify the **frame** explicitly when using `LAST_VALUE`. **`PARTITION BY`** doesn't collapse rows; **`GROUP BY`** does. Most "needs a self-join" analytics are actually window-function problems.
