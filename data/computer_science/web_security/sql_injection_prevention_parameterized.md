### SQL Injection: Types and Prevention

**What SQL injection is:**
- Attacker inserts malicious SQL through user input
- Can read, modify, or delete data; bypass authentication; execute admin operations
- Still in OWASP Top 10 despite being well-understood

**Types of SQL injection:**

**1. Classic (in-band):**
```sql
-- Vulnerable code
query = "SELECT * FROM users WHERE email = '#{params[:email]}'"

-- Attack input: ' OR 1=1 --
-- Resulting query:
SELECT * FROM users WHERE email = '' OR 1=1 --'
-- Returns ALL users
```

**2. Union-based (extract data from other tables):**
```sql
-- Attack input: ' UNION SELECT username, password FROM admins --
SELECT name FROM products WHERE id = '' UNION SELECT username, password FROM admins --'
```

**3. Blind (boolean-based):**
```sql
-- Attacker infers data one bit at a time
-- Input: ' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE id=1) = 'a' --
-- If page loads normally: first char is 'a'. If error: it's not.
```

**4. Time-based blind:**
```sql
-- Input: ' OR IF(1=1, SLEEP(5), 0) --
-- If response takes 5 seconds: injection works
```

**5. Second-order:**
- Malicious input stored in DB, executed later in a different query
- Example: register with username `admin'--`, used later in an unsafe query

**Prevention (in priority order):**

**1. Parameterized queries (prepared statements) — THE solution:**
```ruby
# Rails (ActiveRecord) — SAFE
User.where(email: params[:email])
User.where("email = ?", params[:email])

# Rails — VULNERABLE (string interpolation)
User.where("email = '#{params[:email]}'")  # NEVER DO THIS

# Raw SQL — SAFE
ActiveRecord::Base.connection.exec_query(
  "SELECT * FROM users WHERE email = $1", "SQL", [[nil, params[:email]]]
)
```

```python
# Python (psycopg2) — SAFE
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# Python — VULNERABLE
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

**2. ORM usage (safe by default):**
- ActiveRecord, Sequelize, SQLAlchemy, Ecto — parameterize by default
- Danger zones: raw SQL strings, `where` with string interpolation, dynamic column names

**3. Input validation (defense in depth):**
- Validate type, length, format (email regex, numeric IDs)
- Reject unexpected characters for structured inputs
- NOT a primary defense (can be bypassed), but reduces attack surface

**4. Least privilege database user:**
- App connects with limited permissions (SELECT, INSERT, UPDATE on specific tables)
- No DROP, no access to system tables, no GRANT

**5. WAF (Web Application Firewall):**
- Detects and blocks common SQL injection patterns
- Defense in depth, not a primary control

**Rule of thumb:** ALWAYS use parameterized queries. If you're concatenating user input into SQL strings, you have a SQL injection vulnerability. ORMs are safe by default, but watch for raw SQL escape hatches. Validate input as defense in depth, not as the primary defense.
