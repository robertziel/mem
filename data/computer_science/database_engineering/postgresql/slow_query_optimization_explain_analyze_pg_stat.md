### Optimizing a slow PostgreSQL query

Start with evidence, not guesses.

### Good process

- Use `EXPLAIN ANALYZE` or `EXPLAIN (ANALYZE, BUFFERS)` to inspect the real plan
- Use `pg_stat_statements` to find the slowest or most frequent queries
- Look for sequential scans, bad row estimates, large sorts, and expensive joins
- Add or adjust indexes for `WHERE`, `JOIN`, and `ORDER BY`
- Consider partial indexes, covering indexes, or materialized views for repeated expensive reads
- Run `ANALYZE` so PostgreSQL has fresh statistics

### Common fix directions

- Better indexes
- Simpler query shape
- Smaller result set
- Precomputed data when the query is inherently expensive

**Rule of thumb:** Read the plan first, then change the database or query based on what the planner is actually doing.
