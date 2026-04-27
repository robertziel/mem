### Database Keys

**Key types:**
| Key | Definition | Example |
|-----|-----------|---------|
| **Primary Key** | Uniquely identifies each row. One per table. NOT NULL. | `users.id` |
| **Foreign Key** | References primary key of another table. Enforces referential integrity. | `orders.user_id → users.id` |
| **Candidate Key** | Any column(s) that could be a primary key (unique + not null). | `users.email`, `users.id` — both are candidates |
| **Super Key** | Any set of columns that uniquely identifies rows (includes extra columns). | `{id, email}` is a super key (id alone is enough) |
| **Composite Key** | Primary key made of 2+ columns. | `order_items(order_id, product_id)` |
| **Unique Key** | Enforces uniqueness but allows NULL. Multiple per table. | `users.email` with unique constraint |
| **Alternate Key** | Candidate key not chosen as primary key. | If `id` is PK, then `email` is alternate |

**Surrogate vs Natural key:**
| Feature | Surrogate (artificial) | Natural (from data) |
|---------|----------------------|---------------------|
| Example | Auto-increment `id`, UUID | `email`, `ssn`, `isbn` |
| Stability | Never changes | May change (email, name) |
| Size | Small (integer/bigint) | Variable (string) |
| Meaning | No business meaning | Has business meaning |
| Foreign keys | Simple (one integer) | Complex (longer, may change) |
| Default | ✅ Recommended | Use as unique constraint |

**Foreign key actions:**
```sql
CREATE TABLE orders (
  user_id BIGINT REFERENCES users(id)
    ON DELETE CASCADE         -- delete orders when user deleted
    ON UPDATE CASCADE         -- update FK if user.id changes (rare)
);
```

| Action | ON DELETE | ON UPDATE |
|--------|----------|-----------|
| `CASCADE` | Delete child rows | Update child FK values |
| `SET NULL` | Set FK to NULL | Set FK to NULL |
| `SET DEFAULT` | Set FK to default value | Set FK to default value |
| `RESTRICT` | Block deletion if children exist | Block update |
| `NO ACTION` | Same as RESTRICT (default) | Same as RESTRICT |

```sql
-- Composite primary key
CREATE TABLE order_items (
  order_id BIGINT REFERENCES orders(id),
  product_id BIGINT REFERENCES products(id),
  quantity INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
```

**Rule of thumb:** Use surrogate keys (bigint or UUID) as primary key. Add unique constraints on natural keys (email, username). Always define foreign keys for referential integrity. Use `ON DELETE CASCADE` for dependent children, `RESTRICT` for important references you don't want accidentally deleted.
