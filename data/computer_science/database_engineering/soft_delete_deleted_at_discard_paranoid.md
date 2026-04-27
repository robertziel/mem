### Soft Delete Pattern

Mark records as deleted instead of removing from database.

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- "Delete"
UPDATE users SET deleted_at = NOW() WHERE id = 1;

-- Partial index for active records
CREATE INDEX idx_active_users ON users(id) WHERE deleted_at IS NULL;
```

```ruby
# Rails: Discard gem (recommended)
class User < ApplicationRecord
  include Discard::Model
  default_scope { kept }  # excludes discarded
end

user.discard    # sets deleted_at
user.undiscard  # clears deleted_at
User.kept       # active records
User.discarded  # soft-deleted records
```

**Pros:** undo, audit trail, foreign key integrity preserved.
**Cons:** all queries must filter `WHERE deleted_at IS NULL`, index bloat.

**Rule of thumb:** Soft delete for important data (users, orders). Always add partial index on active records. Use Discard gem over acts_as_paranoid (better maintained). Hard-delete non-important data (logs, temp records).
