### EAV (Entity-Attribute-Value) — Anti-Pattern

```sql
CREATE TABLE attributes (
  entity_id BIGINT,
  attribute_name TEXT,
  attribute_value TEXT
);

-- Stores: (1, 'color', 'red'), (1, 'size', 'XL'), (1, 'weight', '2.5')
```

**Why it's an anti-pattern:**
- No type safety (everything is TEXT)
- Can't use database constraints (CHECK, NOT NULL per attribute)
- Queries require complex pivoting
- Joins are expensive
- No index optimization per attribute

**Better alternatives:**
| Need | Use instead |
|------|------------|
| Flexible attributes | JSONB column |
| Known set of attributes | Regular columns |
| User-defined fields | JSONB with schema validation in app |
| Product variants | Separate table per variant type |

```sql
-- JSONB is almost always better than EAV
ALTER TABLE products ADD COLUMN metadata JSONB DEFAULT '{}';
UPDATE products SET metadata = '{"color": "red", "size": "XL"}';
SELECT * FROM products WHERE metadata->>'color' = 'red';
```

**Rule of thumb:** Avoid EAV. Use JSONB columns instead (indexable, queryable, typed within JSON). EAV only makes sense in legacy systems or when you truly can't predict ANY attributes at design time.
