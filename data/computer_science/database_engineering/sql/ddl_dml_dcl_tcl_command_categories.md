### SQL Command Categories (DDL, DML, DCL, TCL)

**DDL (Data Definition Language) — structure:**
```sql
CREATE TABLE users (id BIGSERIAL PRIMARY KEY, name TEXT);
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
DROP TABLE users;
TRUNCATE TABLE users;          -- MySQL: resets AUTO_INCREMENT.
                               -- PostgreSQL: does NOT reset sequences unless you add RESTART IDENTITY.
TRUNCATE TABLE users RESTART IDENTITY;        -- PostgreSQL: also reset sequences
ALTER TABLE old_name RENAME TO new_name;      -- PostgreSQL / standard SQL
-- RENAME TABLE old_name TO new_name;         -- MySQL-only syntax
```
- Defines/modifies database structure (tables, indexes, schemas)
- Auto-committed (can't ROLLBACK a DROP in most databases)
- PostgreSQL exception: DDL IS transactional (can rollback CREATE/DROP within a transaction)

**DML (Data Manipulation Language) — data:**
```sql
SELECT name, email FROM users WHERE active = true;
INSERT INTO users (name, email) VALUES ('Alice', 'a@b.com');
UPDATE users SET name = 'Bob' WHERE id = 1;
DELETE FROM users WHERE id = 1;
MERGE INTO ... USING ... WHEN MATCHED THEN UPDATE ...;   -- upsert (PostgreSQL 15+; older PG uses INSERT ... ON CONFLICT)
```
- Reads and modifies data within tables
- Can be rolled back within a transaction

**DCL (Data Control Language) — permissions:**
```sql
GRANT SELECT, INSERT ON users TO app_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
REVOKE DELETE ON users FROM app_role;
GRANT USAGE ON SCHEMA analytics TO readonly_role;
```
- Controls access permissions
- Who can do what on which objects

**TCL (Transaction Control Language) — transactions:**
```sql
BEGIN;                         -- start transaction
  INSERT INTO orders (...) VALUES (...);
  UPDATE inventory SET stock = stock - 1 WHERE product_id = 1;
  SAVEPOINT after_insert;      -- checkpoint within transaction
  -- ... more operations ...
  ROLLBACK TO after_insert;    -- undo back to savepoint (not entire transaction)
COMMIT;                        -- make all changes permanent

-- Or:
ROLLBACK;                      -- undo entire transaction
```

**Quick reference:**
| Category | Commands | Purpose |
|----------|----------|---------|
| DDL | CREATE, ALTER, DROP, TRUNCATE | Define structure |
| DML | SELECT, INSERT, UPDATE, DELETE | Manipulate data |
| DCL | GRANT, REVOKE | Control access |
| TCL | BEGIN, COMMIT, ROLLBACK, SAVEPOINT | Manage transactions |

**DELETE vs TRUNCATE vs DROP:**
| Command | What | Logged | Rollback | Triggers |
|---------|------|--------|----------|----------|
| DELETE | Remove rows (with WHERE) | Yes (row by row) | Yes | Fires triggers |
| TRUNCATE | Remove ALL rows | Minimal logging | Yes (in PG) | No row triggers; PG fires BEFORE/AFTER TRUNCATE statement-level triggers; MySQL fires no triggers |
| DROP | Remove entire table | DDL | Yes (in PG) | No triggers |

**Rule of thumb:** DDL for structure, DML for data, DCL for permissions, TCL for transactions. PostgreSQL is special: DDL is transactional (can rollback CREATE TABLE). TRUNCATE over DELETE for clearing large tables (much faster). Always use transactions for multi-statement operations.
