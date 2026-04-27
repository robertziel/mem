### When to use `JSONB`

`JSONB` is useful for flexible or semi-structured data inside PostgreSQL.

### Good use cases

- Metadata
- User preferences
- Feature flags
- Webhook payloads
- Data that changes shape over time

### Why `JSONB` is popular

- Usually preferable to plain `json` in application code
- Better query support than plain `json`
- Supports indexing, commonly with GIN indexes
- Good for containment and key lookup queries

### When not to use it

- Core relational data that needs strict schema
- Data you frequently join on
- Columns that should be normalized for consistency and constraints

**Rule of thumb:** Use `JSONB` for flexible edges of the model, not as a substitute for normal relational design.
