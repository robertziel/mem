### PostgreSQL Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their own orders
CREATE POLICY user_orders ON orders
  USING (user_id = current_setting('app.current_user_id')::bigint);

-- Multi-tenant isolation
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::bigint);

-- Application sets context per connection:
SET app.current_user_id = '123';
SET app.tenant_id = '42';
SELECT * FROM orders;  -- automatically filtered

-- Admin bypass
CREATE POLICY admin_all ON orders
  USING (current_setting('app.role') = 'admin');
```

**Important bypass caveats:** RLS is **NOT absolute**. It is bypassed by:
- The table owner (unless `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is set)
- Superusers (always)
- Roles with the `BYPASSRLS` attribute
- Referential-integrity checks under some circumstances

Your app should connect as a role that is NOT the table owner, does NOT have `BYPASSRLS`, and is NOT a superuser — and you should set `FORCE ROW LEVEL SECURITY` on sensitive tables.

**Rule of thumb:** RLS gives defense-in-depth for multi-tenant isolation — automatic filtering based on connection context. Configure app roles without ownership/BYPASSRLS/superuser, apply `FORCE ROW LEVEL SECURITY`, and treat RLS as the second line of defense, not the only one.
