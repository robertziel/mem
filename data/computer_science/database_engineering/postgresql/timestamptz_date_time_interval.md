### PostgreSQL Date & Time Types

```sql
timestamp          -- date + time WITHOUT timezone (avoid!)
timestamptz        -- date + time WITH timezone (always use this)
date               -- date only (2024-01-15)
time               -- time only (10:30:00)
interval           -- duration ('2 hours', '3 days')
```

**Always use `timestamptz`:**
```sql
-- timestamptz stores UTC internally, converts to session timezone on display
SET timezone = 'US/Pacific';
SELECT NOW();  -- shows Pacific time
-- Stored as UTC in the database regardless of session timezone

-- timestamp (without tz) — AVOID
-- Stores exactly what you give it — no timezone conversion
-- Leads to bugs when app servers are in different timezones
```

**Interval (duration):**
```sql
SELECT NOW() + INTERVAL '2 hours';
SELECT NOW() - INTERVAL '30 days';
SELECT age('2024-01-01', '2023-01-01');  -- '1 year'
```

**Rule of thumb:** `timestamptz` always (never `timestamp`). PostgreSQL stores UTC internally and converts on display. `date` for date-only fields (birthdate, expiry). `interval` for durations.
