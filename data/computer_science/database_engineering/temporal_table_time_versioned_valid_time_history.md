### Temporal Tables (Time-Versioned Data)

Track how data changes over time with validity periods.

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

**Use for:** pricing history, subscription plans, insurance policies, exchange rates — any data that changes over time and you need to query historically.

**Rule of thumb:** Temporal tables when you need "what was the value at time X?" questions. Use PostgreSQL's range types and exclusion constraints to prevent overlapping periods. Different from audit tables — audit tracks WHO changed, temporal tracks WHAT the value was.
