### PostgreSQL Text / String Types

```sql
text               -- unlimited length (preferred in PostgreSQL)
varchar(255)       -- limited length
char(10)           -- fixed length, right-padded (rarely useful)
```

**In PostgreSQL, `text` and `varchar` perform identically.** No performance difference. Use `text` unless you need a length constraint for validation.

```sql
-- text (no limit, best for PostgreSQL)
CREATE TABLE posts (body TEXT NOT NULL);

-- varchar (when you need to enforce max length)
CREATE TABLE users (username VARCHAR(30) NOT NULL);

-- char (rarely useful, pads with spaces)
CREATE TABLE codes (country_code CHAR(2));  -- 'US', 'GB'
```

**Rule of thumb:** Use `text` in PostgreSQL (no reason to limit unless validation requires it). `varchar(n)` only when the length limit is a business rule. Never use `char` unless you need fixed-length codes.
