### Materialized Views

**What materialized views do:**
- Pre-computed query results stored as a table
- Fast reads (no recomputation on every query)
- Must be refreshed to update (not real-time)

```sql
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS order_count,
  SUM(total) AS revenue,
  AVG(total) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY 1;

-- Query like a table (instant)
SELECT * FROM daily_revenue WHERE day > '2024-01-01' ORDER BY day;
```

**Refreshing:**
```sql
-- Full refresh (locks table during refresh — blocks reads)
REFRESH MATERIALIZED VIEW daily_revenue;

-- Concurrent refresh (no lock — requires unique index)
CREATE UNIQUE INDEX ON daily_revenue (day);
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;
```

**Refresh strategies:**
| Strategy | How | Latency | Use when |
|----------|-----|---------|----------|
| Cron job | `REFRESH` every N minutes | Minutes | Dashboards, reports |
| After write | Trigger refresh after data changes | Seconds | Small materialized views |
| Application | Refresh in background job | Seconds | Control over timing |

**Materialized view vs regular view vs table:**
| Feature | View | Materialized View | Table |
|---------|------|--------------------|-------|
| Stores data | No (query rewritten) | Yes (snapshot) | Yes |
| Always fresh | Yes | No (must refresh) | Yes (with writes) |
| Read speed | Slow (recomputes) | Fast | Fast |
| Indexable | No | Yes | Yes |

**When to use:**
- Expensive aggregation queries hit frequently (dashboards)
- Reports that don't need real-time data
- Denormalized views for read APIs
- Replace slow JOINs with pre-joined data

**Rule of thumb:** Materialized views for expensive, frequently-read queries where slight staleness is acceptable. Always use `CONCURRENTLY` in production (requires unique index). Refresh via cron or background job. Not a replacement for proper indexing — optimize queries first.
