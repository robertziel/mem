### Indexes: pros & cons (short)

**Pros:**
- Faster reads and lookups.
- Enforce uniqueness (unique index).

**Cons:**
- Slower writes (insert/update/delete).
- More storage.
- Extra maintenance (vacuum/reindex).

**Rule of thumb:** index columns used in filters, joins, and sorts.
