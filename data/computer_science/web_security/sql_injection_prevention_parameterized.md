### SQL Injection (Types & Prevention)

**Attack types — what each one looks like:**

| Type | Mechanism | Detect by |
|---|---|---|
| **Classic / in-band** | Inject `' OR 1=1 --` to bypass auth or dump rows | Direct response shows extra rows / error reveals query |
| **Error-based** | Force a DB error that leaks info in the message | Verbose error pages show schema, version, types |
| **Union-based** | `' UNION SELECT username, password FROM admins --` | Extra columns appear in response |
| **Blind boolean** | `' AND SUBSTRING(password,1,1)='a' --` — page differs by truthy/falsy | Slight response differences (page renders or 404s) |
| **Blind time-based** | `' OR IF(1=1, SLEEP(5), 0) --` — server pauses | Latency oracle |
| **Out-of-band** | Trigger DNS lookup / HTTP fetch from DB to attacker | DB makes outbound to attacker host |
| **Second-order** | Store benign-looking payload (e.g. `admin'--`); executed later in a different query | Audit later queries that concatenate stored fields |
| **Stacked queries** | `; DROP TABLE users` (DB-permitting) | Multiple statements in one execute call |

**Prevention controls — in priority order:**

| Priority | Control | Effectiveness | Cost |
|---|---|---|---|
| **1** | **Parameterized queries / prepared statements** | The fix | Free |
| 2 | ORM with safe-by-default APIs | Very high | Use it correctly |
| 3 | Stored procedures (called with bound params) | High | Maintenance |
| 4 | Allowlist for **dynamic identifiers** (table/column names) | Required for cases where binding can't help | Per-query work |
| 5 | Input validation (type/length/format) | Defense in depth — **not primary** | Cheap |
| 6 | Least-privilege DB user | Reduces blast radius | Setup |
| 7 | WAF | Catches common patterns; bypassable | Infra |
| 8 | Generic error pages | Removes oracle for blind/error attacks | Trivial |

**Parameterized queries — the only real fix:**

| Language / lib | ✅ Safe | ❌ Vulnerable |
|---|---|---|
| Rails ActiveRecord | `User.where(email: params[:email])` | `User.where("email = '#{params[:email]}'")` |
| Rails (placeholder) | `User.where("email = ?", params[:email])` | string interpolation in `where` / `find_by_sql` |
| Python (DB-API) | `cursor.execute("... = %s", (email,))` | `cursor.execute(f"... = '{email}'")` |
| Python (SQLAlchemy core) | `select(User).where(User.email == email)` | `text(f"... = '{email}'")` without `:bind` |
| Node (`pg`) | `client.query("... = $1", [email])` | `` client.query(`... = '${email}'`) `` |
| Node (knex) | `.where('email', email)` | `.whereRaw(`email = '${email}'`)` |
| Java (JDBC) | `PreparedStatement` + `setString(1, email)` | `Statement.execute("... = '" + email + "'")` |
| Go (`database/sql`) | `db.Query("... = $1", email)` | `db.Query("... = '" + email + "'")` |
| PHP (PDO) | `$stmt->execute([':e' => $email])` | `"$query = '... = $email'"` (mysqli, no prepare) |

**Why parameterization is safe:**

| Step | What happens |
|---|---|
| 1 | Driver sends the SQL **template** with placeholders to the DB |
| 2 | DB parses + plans the query — **structure is fixed** before any user data is seen |
| 3 | Driver sends the values separately, typed |
| 4 | DB binds them as **data**, never re-parses them as SQL |

> The user's input *cannot* change the parsed query tree — there's no string concatenation anywhere.

**ORM danger zones (where ORMs lose their safety):**

| Pattern | Risk | Fix |
|---|---|---|
| String SQL with interpolation in `where`/`order` | Direct injection | `where("col = ?", value)` or hash form |
| `find_by_sql("...#{var}...")` | Direct | Use placeholders |
| Dynamic ORDER BY column | `ORDER BY user_input_col` — can't bind identifiers | **Allowlist**: `%w[name created_at].include?(col) or raise` |
| Dynamic table/column names | Same as above | Allowlist + map to a constant |
| `LIKE` with user input | Inject `%` to broaden match | Escape `%` and `_` in input |
| Raw SQL via `connection.execute(sql)` | If you concat — vulnerable | Use `exec_query(sql, "name", binds)` with binds |

**Dynamic identifiers — the only case parameterization can't help:**

```ruby
# ORDER BY column comes from user → bind WON'T work for identifiers
ALLOWED_SORT = %w[name email created_at].freeze
col = ALLOWED_SORT.include?(params[:sort]) ? params[:sort] : "created_at"
User.order(col)
```

| Identifier type | Strategy |
|---|---|
| Column name | Allowlist constant |
| Table name | Allowlist constant |
| ORDER direction | Allowlist `["ASC", "DESC"]` |
| LIMIT / OFFSET integer | Cast to integer + bound check |

**Defense in depth (after parameterization is in place):**

| Layer | What it catches |
|---|---|
| Input validation (type/length/regex) | Obvious garbage; reduces attack surface |
| Generic error pages (no stack traces, no SQL fragments) | Blind/error oracles |
| Least-privilege DB user (no DDL, no system tables) | Limits blast radius if a SQLi slips through |
| Read-only replicas for read paths | Even an injection can't write |
| Query timeouts | Limits time-based blind extraction speed |
| WAF / pattern detection | Catches script-kiddie payloads |
| DB activity monitoring | Alerts on anomalous query shapes |

**Detection in your own code (audit / CI):**

| Tool / signal | What it finds |
|---|---|
| `brakeman` (Rails) | String concatenation into `where`, `find_by_sql`, etc. |
| `bandit` (Python) | `cursor.execute` with f-string / `%` formatting |
| `gosec` (Go) | Concatenated SQL strings in `db.Query` |
| `semgrep` rules | Custom patterns across languages |
| Code review checklist | Any `"...#{var}..."` inside a query → reject |

**Quick self-test:**

| Question | If "yes" → vulnerable |
|---|---|
| Does any user input get concatenated/interpolated into SQL? | ✅ |
| Are dynamic ORDER BY / column names taken from user input without an allowlist? | ✅ |
| Do error responses include database messages? | Possible blind oracle |
| Does the app DB user have DROP / GRANT / system-table access? | Larger blast radius |

**Rule of thumb:** **always use parameterized queries.** ORMs are safe by default — danger is in raw SQL strings, string-interpolated `where`, and dynamic identifiers (table/column names — those need an **allowlist**, not a bind). Input validation is defense in depth, not the primary fix. Run a SAST scanner (`brakeman` / `bandit` / `semgrep`) on every PR to catch regressions.
