### PostgreSQL Primary Key Types (Serial, UUID, Identity)

```sql
-- serial (legacy auto-increment)
CREATE TABLE users (id SERIAL PRIMARY KEY);       -- integer
CREATE TABLE users (id BIGSERIAL PRIMARY KEY);    -- bigint

-- GENERATED ALWAYS (modern, SQL standard)
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

-- UUID
CREATE EXTENSION pgcrypto;
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
```

| Type | Size | Guessable | Sortable | Distributed |
|------|------|-----------|----------|-------------|
| SERIAL/BIGSERIAL | 4/8 bytes | Yes (sequential) | Yes | Conflicts |
| UUID v4 | 16 bytes | No (random) | No | Globally unique |
| UUID v7 | 16 bytes | No | Yes (time-ordered) | Globally unique |

**Rule of thumb:** `BIGSERIAL`/`GENERATED AS IDENTITY` for most apps. UUID when you need globally unique IDs (distributed, public-facing). UUIDv7 for best of both (unique + sortable). Always use `bigint` over `integer` for IDs (avoids overflow on growth).
