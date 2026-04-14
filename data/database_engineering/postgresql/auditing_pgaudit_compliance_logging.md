### PostgreSQL Auditing with pgaudit

```sql
CREATE EXTENSION pgaudit;

-- Log all DDL and write operations
SET pgaudit.log = 'ddl, write';

-- Audit log entries:
-- AUDIT: SESSION,1,1,DDL,CREATE TABLE,,,"CREATE TABLE secrets (...);"
-- AUDIT: SESSION,2,1,WRITE,INSERT,,,"INSERT INTO secrets VALUES (...);"
```

**What to audit:**
| Setting | What gets logged |
|---------|-----------------|
| `read` | SELECT statements |
| `write` | INSERT, UPDATE, DELETE |
| `ddl` | CREATE, ALTER, DROP |
| `role` | GRANT, REVOKE |
| `function` | Function calls |
| `all` | Everything (expensive) |

**RBAC (Role-Based Access Control):**
```sql
CREATE ROLE readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

CREATE ROLE readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;

GRANT readonly TO analyst_user;
GRANT readwrite TO app_user;
```

**Rule of thumb:** pgaudit for compliance (SOC2, HIPAA, PCI). Log `ddl` + `write` at minimum. Application connects with least-privilege role (never superuser). Audit logs answer "who did what, when" for security investigations.
