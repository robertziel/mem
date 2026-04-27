### PostgreSQL Extension: pg_stat_statements (Slow Query Tracking)

```sql
CREATE EXTENSION pg_stat_statements;

-- Top 20 slowest queries by total time
SELECT query, calls, mean_exec_time, total_exec_time,
       rows, shared_blks_hit, shared_blks_read
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Most frequently called queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;

-- Reset stats
SELECT pg_stat_statements_reset();
```

**Rule of thumb:** Enable `pg_stat_statements` on EVERY production database. It's the #1 tool for finding slow queries. Monitor: total_exec_time (overall impact), mean_exec_time (per-query latency), calls (frequency). Optimize queries with highest total time first.
