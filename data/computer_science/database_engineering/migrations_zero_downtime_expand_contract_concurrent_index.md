### Database Migrations (Zero-Downtime)

**The problem:**
- Schema changes can lock tables, break running code, or cause downtime
- With rolling deploys, old and new code versions run simultaneously
- Migration must be compatible with both old and new application code

**Safe migration pattern (expand-contract):**

**Phase 1: Expand (backward compatible)**
- Add new column, table, or index
- Old code ignores new column (doesn't break)
- New code writes to both old and new

**Phase 2: Migrate data**
- Backfill existing data into new structure
- Run in batches to avoid long-running transactions

**Phase 3: Contract (remove old)**
- Deploy code that only uses new structure
- Drop old column/table (after verifying no code references it)

**Example: Rename a column**
```
# WRONG (breaks running code immediately):
ALTER TABLE users RENAME COLUMN name TO full_name;

# RIGHT (3 deployments):
# Deploy 1: Add new column, write to both
ALTER TABLE users ADD COLUMN full_name VARCHAR;
UPDATE users SET full_name = name WHERE full_name IS NULL;  -- backfill in batches

# Deploy 2: Code reads from full_name, writes to both
# Verify full_name is populated for all rows

# Deploy 3: Drop old column
ALTER TABLE users DROP COLUMN name;
```

**Dangerous operations and safe alternatives:**

| Dangerous | Safe alternative |
|-----------|-----------------|
| `ALTER TABLE ADD COLUMN ... DEFAULT x` (pre PG11) | Add column nullable, backfill, then set default |
| `CREATE INDEX` | `CREATE INDEX CONCURRENTLY` (no table lock) |
| `ALTER TABLE ... NOT NULL` | Add CHECK constraint NOT VALID, then VALIDATE |
| `ALTER TABLE DROP COLUMN` | Stop reading column first, then drop |
| `ALTER TABLE RENAME COLUMN` | Expand-contract pattern |
| `ALTER TABLE ALTER COLUMN TYPE` | Add new column, backfill, switch |

**PostgreSQL specifics:**
```sql
-- Safe index creation (no lock on reads/writes)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Safe NOT NULL (two steps to avoid full table lock)
ALTER TABLE users ADD CONSTRAINT users_email_nn
  CHECK (email IS NOT NULL) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT users_email_nn;

-- Batched backfill
UPDATE users SET full_name = name
WHERE id IN (SELECT id FROM users WHERE full_name IS NULL LIMIT 10000);
-- Repeat until done
```

**Advisory locks for migrations:**
```sql
-- Prevent concurrent migrations
SELECT pg_advisory_lock(12345);
-- Run migration
SELECT pg_advisory_unlock(12345);
```

**Migration tools:**
- Rails: `ActiveRecord::Migration` (up/down, reversible)
- Flyway: versioned SQL migrations (Java ecosystem)
- Alembic: Python (SQLAlchemy)
- golang-migrate: Go
- strong_migrations gem (Rails): catches unsafe migrations

**Best practices:**
- Never run migrations inside a transaction with long-running DDL
- Set `lock_timeout` to fail fast rather than wait: `SET lock_timeout = '5s'`
- Test migrations on a copy of production data
- Make every migration reversible (write a down migration)
- Deploy code changes and schema changes separately

**Rule of thumb:** Every migration should be backward compatible with the currently running code. Use expand-contract for breaking changes. `CREATE INDEX CONCURRENTLY` always. Set lock_timeout. Use strong_migrations or similar linting tools.
