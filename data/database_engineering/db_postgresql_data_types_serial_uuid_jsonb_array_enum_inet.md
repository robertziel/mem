### PostgreSQL Data Types

**Numeric types:**
| Type | Size | Range | Use for |
|------|------|-------|---------|
| `smallint` | 2 bytes | -32K to 32K | Small counters |
| `integer` | 4 bytes | -2B to 2B | Default integers |
| `bigint` | 8 bytes | -9.2×10¹⁸ to 9.2×10¹⁸ | Large IDs, counters |
| `numeric(p,s)` | Variable | Arbitrary precision | Money, exact decimals |
| `real` | 4 bytes | 6 decimal digits | Approximate, avoid for money |
| `double precision` | 8 bytes | 15 decimal digits | Scientific, coordinates |

**Never use float for money** — use `integer` (cents) or `numeric`.

**Identity / Primary keys:**
```sql
-- serial (legacy, auto-incrementing)
CREATE TABLE users (id SERIAL PRIMARY KEY);  -- integer
CREATE TABLE users (id BIGSERIAL PRIMARY KEY);  -- bigint

-- GENERATED ALWAYS (modern, SQL standard)
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

-- UUID (globally unique, no sequential guessing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
```

| Type | Pros | Cons |
|------|------|------|
| `SERIAL/BIGSERIAL` | Small, fast, sortable by creation | Sequential (guessable), single-node only |
| `UUID` | Globally unique, no coordination | Large (16 bytes), random (bad for B-tree locality) |
| `UUIDv7` | Time-ordered UUID (sortable + unique) | Needs extension or application-generated |

**Text types:**
```sql
text               -- unlimited length (preferred in PostgreSQL)
varchar(255)       -- limited length (no performance difference from text in PG)
char(10)           -- fixed length, right-padded (rarely useful)
```
In PostgreSQL, `text` and `varchar` perform identically. Use `text` unless you need a length constraint for validation.

**Date/time types:**
```sql
timestamp          -- date + time without timezone (avoid)
timestamptz        -- date + time WITH timezone (always use this)
date               -- date only
time               -- time only
interval           -- duration ('2 hours', '3 days')
```
**Always use `timestamptz`** — it stores UTC internally, converts to session timezone on display.

**JSONB (binary JSON):**
```sql
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query JSON fields
SELECT data->>'name' AS name FROM events;
SELECT data->'address'->>'city' FROM events;
SELECT * FROM events WHERE data @> '{"status": "active"}';

-- GIN index for fast JSONB queries
CREATE INDEX idx_events_data ON events USING GIN (data);
```

**Array type:**
```sql
CREATE TABLE posts (tags TEXT[]);
INSERT INTO posts (tags) VALUES (ARRAY['ruby', 'rails', 'postgresql']);

-- Query
SELECT * FROM posts WHERE 'ruby' = ANY(tags);
SELECT * FROM posts WHERE tags @> ARRAY['ruby', 'rails'];  -- contains both

-- GIN index
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
```

**Enum type:**
```sql
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TABLE orders (status order_status NOT NULL DEFAULT 'pending');

-- Adding values (safe, no lock)
ALTER TYPE order_status ADD VALUE 'refunded' AFTER 'cancelled';
-- Cannot remove or rename values (limitation)
```

**Other useful types:**
```sql
inet          -- IP address: '192.168.1.1', '10.0.0.0/8'
cidr          -- Network address: '192.168.1.0/24'
macaddr       -- MAC address
boolean       -- true/false
bytea         -- Binary data (files, images — prefer S3 for large files)
tstzrange     -- Timestamp range: '[2024-01-01, 2024-12-31]'
```

**Rule of thumb:** `bigint` for IDs (or UUID for distributed). `timestamptz` always (never `timestamp`). `text` over `varchar` in PostgreSQL. `integer` in cents for money (not float). JSONB for semi-structured data. Arrays for simple lists. Enums for fixed sets (but hard to remove values).
