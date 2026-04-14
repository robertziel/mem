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

**Rule of thumb:** RLS for multi-tenant data isolation (automatic, can't bypass in SQL). Set context variables per connection from the application. Every query automatically filtered — no way to accidentally see another tenant's data.
