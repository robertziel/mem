### Database Security (RLS, Encryption, Auditing)

**Row-Level Security (RLS):**
```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own orders
CREATE POLICY user_orders ON orders
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::bigint);

-- Set current user in session (from application)
SET app.current_user_id = '123';
SELECT * FROM orders;  -- only sees orders where user_id = 123

-- Admin bypass
CREATE POLICY admin_all ON orders
  FOR ALL
  USING (current_setting('app.role') = 'admin');
```

**Multi-tenant RLS:**
```sql
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::bigint);

-- Application sets tenant on every connection:
SET app.tenant_id = '42';
-- All queries automatically filtered to tenant 42
```

**Encryption at rest:**
| Method | What | How |
|--------|------|-----|
| Disk encryption | Entire volume encrypted | AWS EBS encryption, LUKS |
| TDE (Transparent Data Encryption) | Database files encrypted | Enterprise PostgreSQL only |
| Column encryption | Specific sensitive columns | `pgcrypto` extension |

```sql
-- Column-level encryption with pgcrypto
CREATE EXTENSION pgcrypto;

INSERT INTO users (ssn_encrypted)
VALUES (pgp_sym_encrypt('123-45-6789', 'encryption_key'));

SELECT pgp_sym_decrypt(ssn_encrypted, 'encryption_key') AS ssn
FROM users WHERE id = 1;
```

**Encryption in transit:**
```
# postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

# pg_hba.conf — require SSL
hostssl all all 0.0.0.0/0 md5
```

**Auditing with pgaudit:**
```sql
CREATE EXTENSION pgaudit;

-- Log all DDL and write operations
SET pgaudit.log = 'ddl, write';

-- Audit log entries:
-- AUDIT: SESSION,1,1,DDL,CREATE TABLE,,,"CREATE TABLE secrets (...);"
-- AUDIT: SESSION,2,1,WRITE,INSERT,,,"INSERT INTO secrets VALUES (...);"
```

**RBAC (Role-Based Access Control):**
```sql
-- Create roles
CREATE ROLE readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

CREATE ROLE readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;

-- Assign to users
GRANT readonly TO analyst_user;
GRANT readwrite TO app_user;

-- Least privilege: app connects with limited role
-- No DROP, no CREATE, no access to system tables
```

**Security checklist:**
- [ ] Application connects with least-privilege role (no superuser)
- [ ] SSL enforced for all connections
- [ ] RLS for multi-tenant data isolation
- [ ] pgaudit for compliance logging
- [ ] Encrypted backups
- [ ] Rotate database credentials regularly
- [ ] No plaintext secrets in connection strings

**Rule of thumb:** RLS for multi-tenant isolation (automatic, can't bypass in SQL). Encryption at rest via disk encryption (simplest) or pgcrypto for specific columns. Always require SSL. Use pgaudit for compliance. Connect with least-privilege roles — never use the superuser for applications.
