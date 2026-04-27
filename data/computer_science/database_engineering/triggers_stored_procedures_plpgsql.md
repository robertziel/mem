### Database Triggers & Stored Procedures

**Trigger:**
- Code that runs automatically on INSERT, UPDATE, or DELETE
- Defined per-table, fires before or after the operation

```sql
-- Audit log trigger — must branch on TG_OP because NEW is NULL on DELETE
-- and OLD is NULL on INSERT (accessing .id on NULL raises in PL/pgSQL).
CREATE OR REPLACE FUNCTION audit_changes() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, row_id, changed_at, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, NOW(), row_to_json(OLD), NULL);
    RETURN OLD;  -- DELETE triggers must RETURN OLD (not NEW, which is NULL)
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, row_id, changed_at, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, NOW(), NULL, row_to_json(NEW));
    RETURN NEW;
  ELSE  -- UPDATE
    INSERT INTO audit_log (table_name, operation, row_id, changed_at, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, NOW(), row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_changes();
```

**Trigger types:**
| Type | When | Use for |
|------|------|---------|
| BEFORE INSERT/UPDATE | Before row is saved | Validation, default values, data transformation |
| AFTER INSERT/UPDATE | After row is saved | Audit logging, notifications, denormalization |
| INSTEAD OF | Replace the operation (views only) | Updatable views |
| BEFORE DELETE | Before row is deleted | Prevent deletion, soft-delete |

**Common trigger uses:**
```sql
-- Auto-update updated_at
CREATE FUNCTION update_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Auto-update search vector (full-text search)
CREATE TRIGGER update_search_vector
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, body);
```

**Stored procedures / functions:**
```sql
-- Function (returns a value)
CREATE FUNCTION get_user_order_total(user_id_param BIGINT) RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM orders
  WHERE user_id = user_id_param AND status = 'completed';
$$ LANGUAGE sql STABLE;

-- Call
SELECT get_user_order_total(123);

-- Procedure (PostgreSQL 11+, can manage transactions)
CREATE PROCEDURE archive_old_orders(cutoff_date DATE) AS $$
BEGIN
  INSERT INTO archived_orders SELECT * FROM orders WHERE created_at < cutoff_date;
  DELETE FROM orders WHERE created_at < cutoff_date;
  COMMIT;
END;
$$ LANGUAGE plpgsql;

CALL archive_old_orders('2023-01-01');
```

**When to use vs avoid:**
| Use triggers/procedures | Avoid triggers/procedures |
|------------------------|--------------------------|
| Audit logging | Complex business logic (put in application) |
| Auto-update timestamps | Cross-service orchestration |
| Denormalization (update counter cache) | Sending emails/HTTP calls |
| Data validation (constraints that CHECK can't express) | Anything that needs to be testable in application |
| Search vector updates | When it hides behavior from developers |

**Why Rails developers avoid triggers:**
- Hidden behavior (not visible in application code)
- Hard to test (tests must set up DB triggers)
- Hard to debug (where did this data come from?)
- Deployment complexity (must manage DB migration + trigger)
- Doesn't work with `build_stubbed` in tests

**Rule of thumb:** Use triggers for audit logging, timestamps, and search vectors (DB-level concerns). Keep business logic in the application (testable, visible, debuggable). If you add a trigger, document it prominently. Most Rails apps should have zero triggers except updated_at and maybe audit logging.
