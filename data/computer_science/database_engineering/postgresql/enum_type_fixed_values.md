### PostgreSQL Enum Type

```sql
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
  status order_status NOT NULL DEFAULT 'pending'
);

-- Adding new values (safe, no table rewrite — takes an ACCESS EXCLUSIVE lock on the type only)
ALTER TYPE order_status ADD VALUE 'refunded' AFTER 'cancelled';
-- Note: before PG 12, ADD VALUE cannot run inside a transaction block.
-- In PG 12+ it can, but the new value is not usable until commit.

-- Renaming values (supported since PG 10)
ALTER TYPE order_status RENAME VALUE 'cancelled' TO 'canceled';
```

**Limitations:**
- Cannot remove values (no DROP VALUE)
- Cannot reorder values (only ADD VALUE BEFORE/AFTER at creation)
- Adding values is safe (no table rewrite); renaming is supported since PG 10

**Enum vs string vs integer:**
| Type | Type safety | Storage | Flexibility |
|------|-----------|---------|-------------|
| Enum | Yes (DB enforced) | 4 bytes | Can only add values |
| VARCHAR + CHECK | Yes (constraint) | Variable | Full flexibility |
| INTEGER | No | 4 bytes | Magic numbers (avoid) |

**Rule of thumb:** Enum for truly fixed sets (order status, role types). If values change often, use VARCHAR with a CHECK constraint or validate in the application. Enums are compact (4 bytes) but inflexible (can't remove values without recreation).
