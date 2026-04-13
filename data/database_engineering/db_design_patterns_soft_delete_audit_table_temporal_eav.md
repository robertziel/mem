### Database Design Patterns

**Soft delete (paranoid delete):**
```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete" = set timestamp
UPDATE users SET deleted_at = NOW() WHERE id = 1;

-- Default scope excludes deleted
CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL;

-- Rails: acts_as_paranoid or Discard gem
class User < ApplicationRecord
  include Discard::Model
  default_scope { kept }  # excludes discarded
end
```
- Pros: undo, audit trail, foreign key integrity
- Cons: all queries must filter `WHERE deleted_at IS NULL`, index bloat
- Always add partial index: `CREATE INDEX idx_active ON users(id) WHERE deleted_at IS NULL;`

**Audit table (change history):**
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id BIGINT NOT NULL,
  operation TEXT NOT NULL,     -- INSERT, UPDATE, DELETE
  changed_by BIGINT,          -- user who made the change
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query: "What happened to user 123?"
SELECT * FROM audit_log WHERE table_name = 'users' AND record_id = 123 ORDER BY changed_at;
```

**Temporal table (bi-temporal):**
```sql
CREATE TABLE prices (
  product_id BIGINT NOT NULL,
  price NUMERIC NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ DEFAULT 'infinity',
  EXCLUDE USING gist (product_id WITH =, tstzrange(valid_from, valid_to) WITH &&)
);

-- Current price
SELECT price FROM prices
WHERE product_id = 1 AND NOW() BETWEEN valid_from AND valid_to;

-- Price at a specific date
SELECT price FROM prices
WHERE product_id = 1 AND '2024-01-15' BETWEEN valid_from AND valid_to;
```

**EAV (Entity-Attribute-Value) — usually an anti-pattern:**
```sql
CREATE TABLE attributes (
  entity_id BIGINT,
  attribute_name TEXT,
  attribute_value TEXT
);

-- Stores: (1, 'color', 'red'), (1, 'size', 'XL')
-- Problems: no type safety, hard to query, slow JOINs
-- Prefer: JSONB column or separate columns
```

**Polymorphic association (Rails-style):**
```sql
CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  body TEXT,
  commentable_type TEXT,    -- 'Post', 'Photo', 'Video'
  commentable_id BIGINT
);
-- Problem: no foreign key constraint (type is a string)
-- Alternative: separate join tables per type
```

**Counter cache (denormalized count):**
```sql
ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0;

-- Maintain via trigger or Rails counter_cache: true
-- Avoids COUNT(*) on every page load
```

**UUID vs serial primary keys:**
| Feature | Serial (BIGINT) | UUID v4 | UUID v7 |
|---------|----------------|---------|---------|
| Size | 8 bytes | 16 bytes | 16 bytes |
| Guessable | Yes (sequential) | No | No |
| Sortable | Yes (by creation) | No (random) | Yes (time-ordered) |
| Index perf | Best (sequential) | Worst (random inserts) | Good (time-ordered) |
| Distributed | Conflicts possible | Globally unique | Globally unique |

**Rule of thumb:** Soft delete with partial indexes for important data. JSONB audit log for change tracking. Avoid EAV — use JSONB columns instead. UUIDv7 if you need globally unique + sortable IDs. Counter cache for frequently counted associations. Keep the database schema as simple as possible — complexity belongs in the application.
