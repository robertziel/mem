### PostgreSQL Enum Type

```sql
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
  status order_status NOT NULL DEFAULT 'pending'
);

-- Adding new values (safe, no lock)
ALTER TYPE order_status ADD VALUE 'refunded' AFTER 'cancelled';
```

**Limitations:**
- Cannot remove values
- Cannot rename values
- Cannot reorder values
- Adding values is safe (no table rewrite)

**Enum vs string vs integer:**
| Type | Type safety | Storage | Flexibility |
|------|-----------|---------|-------------|
| Enum | Yes (DB enforced) | 4 bytes | Can only add values |
| VARCHAR + CHECK | Yes (constraint) | Variable | Full flexibility |
| INTEGER | No | 4 bytes | Magic numbers (avoid) |

**Rule of thumb:** Enum for truly fixed sets (order status, role types). If values change often, use VARCHAR with a CHECK constraint or validate in the application. Enums are compact (4 bytes) but inflexible (can't remove values without recreation).
