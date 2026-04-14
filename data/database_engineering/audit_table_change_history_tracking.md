### Audit Table (Change History Tracking)

```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id BIGINT NOT NULL,
  operation TEXT NOT NULL,     -- INSERT, UPDATE, DELETE
  changed_by BIGINT,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query: "What happened to user 123?"
SELECT * FROM audit_log
WHERE table_name = 'users' AND record_id = 123
ORDER BY changed_at;
```

**Implementation options:**
- Database triggers (automatic, no app code)
- Application-level (gems: `paper_trail`, `audited`)
- CDC via Debezium → Kafka → audit store

**Rule of thumb:** Audit tables for compliance (who changed what, when). paper_trail gem for Rails applications. Database triggers for guaranteed capture (even direct SQL changes). Store old + new values as JSONB for flexible querying.
