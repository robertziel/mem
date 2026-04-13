### PostgreSQL Numeric Data Types

| Type | Size | Range | Use for |
|------|------|-------|---------|
| `smallint` | 2 bytes | -32K to 32K | Small counters |
| `integer` | 4 bytes | -2B to 2B | Default integers |
| `bigint` | 8 bytes | ±9.2×10¹⁸ | Large IDs, counters |
| `numeric(p,s)` | Variable | Arbitrary precision | Money, exact decimals |
| `real` | 4 bytes | 6 decimal digits | Approximate |
| `double precision` | 8 bytes | 15 decimal digits | Scientific |

**Never use float for money:**
```ruby
# BAD
0.1 + 0.2  # => 0.30000000000000004 (floating point error!)

# GOOD: store in cents as integer
total_cents = 1050  # $10.50
# Or use numeric(10,2) in PostgreSQL
```

**Rule of thumb:** `integer` for most numbers. `bigint` for IDs and large counters. `numeric` for money (or store as integer cents). Never `real`/`double precision` for financial calculations.
