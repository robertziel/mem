### Adding indexes to a 10M row table (short)

**Challenges:**
- Long locks and downtime.
- Write amplification during index build.

**Safer approaches:**
- Use **CONCURRENTLY** (Postgres) to avoid blocking writes.
- Backfill in small batches if needed.
- Add the index off-peak.

```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

**Rule of thumb:** prefer online index builds and monitor lock time.
