### Postgres `JSONB` — When to Use, Indexes, Metadata

**Definition:** `JSONB` is Postgres's **binary JSON** type — same surface as `json` but stored decomposed (faster queries, supports indexing). Use it for **flexible / semi-structured data at the edges of your model**, not as a substitute for normalized columns.

**`json` vs `jsonb`:**

| Property | `json` | **`jsonb`** |
|---|---|---|
| Storage | Raw text | Decomposed binary |
| Insert speed | Faster | Slightly slower (parsing) |
| Query speed | Slower (re-parse each time) | Fast (already parsed) |
| Indexable | No (only expression indexes) | **Yes — GIN, B-tree on expressions** |
| Preserves whitespace / key order / duplicate keys | **Yes** | **No** (canonicalizes) |
| Default choice | Almost never | **Almost always** |

> **Use `jsonb` by default.** `json` is only useful if you must round-trip the exact original document.

**Good fits:**

| Use case | Why |
|---|---|
| **Metadata** | Per-row flexible fields without schema churn |
| **User preferences / settings** | Sparse, optional, evolves often |
| **Feature flags / config** | Per-tenant overrides |
| **Webhook / event payloads** | Schema you don't control |
| **External API responses** | Cache the body, query select fields |
| **Polymorphic event data** | Different shapes by `event_type` |
| **Audit log details** | Bag of fields per action |

**Bad fits — use a real column instead:**

| Anti-use case | Why |
|---|---|
| Foreign keys | Can't enforce referential integrity inside JSONB |
| Frequently joined fields | JSON ops are slower than column ops |
| Strict schema needed | Use a column + check constraint |
| Heavily aggregated fields | `SUM(value->>'amount')::numeric` is painful |
| High-cardinality search keys | Real column + B-tree wins |
| Numeric / date columns | Type juggling errors leak through |

**Operators (the ones you'll actually use):**

| Operator | Returns | Example |
|---|---|---|
| `->` | JSON value | `data->'user'` |
| `->>` | Text | `data->>'name'` |
| `#>` | JSON path | `data#>'{user,addr}'` |
| `#>>` | Text path | `data#>>'{user,addr,zip}'` |
| `@>` | Contains | `data @> '{"role":"admin"}'` |
| `<@` | Contained by | `'{"role":"admin"}' <@ data` |
| `?` | Has top-level key | `data ? 'email'` |
| `?|` | Has any of | `data ?| array['a','b']` |
| `?&` | Has all of | `data ?& array['a','b']` |

**Index strategies — pick by query pattern:**

| Query pattern | Index | Notes |
|---|---|---|
| Containment (`@>`) | **GIN** with `jsonb_ops` (default) | Big index, fast contains |
| Containment + smaller index | GIN with `jsonb_path_ops` | Smaller but only `@>` works |
| Exact-key lookup (`data->>'k' = 'v'`) | **B-tree on expression** | `(data->>'role')` |
| Numeric range on a key | B-tree on cast expression | `((data->>'amount')::int)` |
| Existence (`data ? 'k'`) | GIN | Default ops supports this |
| Mixed: text equality + ranges | Multi-column index on extracted columns | Or extract to real columns |

**Examples:**

```sql
-- Default GIN — supports @>, ?, ?|, ?&
CREATE INDEX events_data_idx ON events USING GIN (data);

-- Smaller GIN — only supports @>
CREATE INDEX events_data_path_idx ON events USING GIN (data jsonb_path_ops);

-- B-tree on extracted text
CREATE INDEX events_role_idx ON events ((data->>'role'));

-- B-tree on extracted number (cast required)
CREATE INDEX events_amount_idx ON events (((data->>'amount')::int));

-- Partial index (only rows that have the key)
CREATE INDEX events_priority_idx
  ON events ((data->>'priority'))
  WHERE data ? 'priority';
```

**Containment query (the JSONB superpower):**

```sql
-- Find all users with role admin AND active true
SELECT * FROM users
 WHERE preferences @> '{"role":"admin","active":true}';

-- Uses GIN index; very fast
```

**When to extract to real columns:**

| Signal | Action |
|---|---|
| You query `data->>'X'` in 5+ places | Extract X to a column |
| You filter or join on it | Extract |
| It's required (always present) | Extract |
| Constraints / FK / NOT NULL needed | Extract |
| Aggregations frequent | Extract |
| It barely ever appears in queries | Keep in JSONB |

**Hybrid pattern (common in practice):**

```sql
CREATE TABLE events (
  id          bigserial PRIMARY KEY,
  event_type  text NOT NULL,        -- extracted: always present, indexed
  user_id     bigint NOT NULL,      -- extracted: FK, joined
  occurred_at timestamptz NOT NULL, -- extracted: range queries
  data        jsonb NOT NULL        -- everything else
);
```

| Field | Why a real column | Why not in JSONB |
|---|---|---|
| `event_type` | Filtered in 90% of queries | Can be NOT NULL constrained |
| `user_id` | Joined to `users` | FK constraint needed |
| `occurred_at` | Range queries, partitioning | B-tree native is faster |
| `data` | Per-event schema differs | Flexible at the edges |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Numeric values you forget to cast | `data->>'n' > '9'` is **string** compare — `'10' < '9'` is true |
| Storing huge JSON blobs (>2KB) | TOAST hit on every read |
| JSON arrays you can't easily aggregate | Extract to a related table |
| Default GIN is huge | Use `jsonb_path_ops` if only `@>` matters |
| Updating one key rewrites the whole row | High-write JSONB causes bloat |
| `IS NULL` vs `?` | `data->>'k' IS NULL` matches missing **and** explicit JSON null |
| Treating JSONB as a schema-less escape hatch | Becomes a pile of unindexed data |

**Update patterns:**

```sql
-- Set / overwrite a key
UPDATE users SET preferences = preferences || '{"theme":"dark"}'::jsonb WHERE id = 1;

-- Remove a key
UPDATE users SET preferences = preferences - 'old_flag' WHERE id = 1;

-- Deep merge (nested)
UPDATE users SET preferences = jsonb_set(preferences, '{ui,theme}', '"dark"') WHERE id = 1;
```

| Operator | Effect |
|---|---|
| `||` | Shallow merge (right wins) |
| `-` | Remove top-level key |
| `#-` | Remove path |
| `jsonb_set` | Set value at path; can create missing parents |

**Decision matrix:**

| Need | Pick |
|---|---|
| Schema-stable, queried-often field | **Real column** |
| Per-row flexible bag of metadata | **JSONB** |
| Polymorphic event payload | **JSONB** + extracted discriminator |
| Vendor webhook bodies | **JSONB** + extracted IDs |
| Hot column with frequent updates | **Real column** (avoid JSONB bloat) |

**Cross-references:**

- Postgres indexes (B-tree, GIN, BRIN): [postgresql_indexes_*.md](postgresql_indexes_btree_gin_brin.md)
- Query optimization (EXPLAIN, sargability): [query_optimization_*.md](../query_optimization_explain_analyze_indexes.md)
- Slow-query workflow: [slow_query_*.md](slow_query_optimization_explain_analyze_pg_stat.md)

**Rule of thumb:** **Use `jsonb` (not `json`).** Reach for it at the **edges** of your model — metadata, preferences, vendor payloads, polymorphic event data — never as a substitute for normalized columns. **GIN with `@>`** is the primary index strategy; **B-tree on expression** for exact key lookups. **Extract to a real column** the moment a JSONB field becomes hot, joined, or constrained.
