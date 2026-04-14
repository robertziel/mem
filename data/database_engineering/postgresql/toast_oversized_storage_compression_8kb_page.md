### PostgreSQL TOAST (The Oversized-Attribute Storage Technique)

**Problem TOAST solves:**
- PostgreSQL pages are 8 KB
- A single row must fit in one page
- But a TEXT/JSONB/BYTEA column can be much larger
- TOAST handles values that exceed ~2 KB

**How TOAST works:**
```
Row with large column (e.g., 50 KB JSON body):
  1. Try to compress the value (LZ compression)
  2. If still > 2KB: store out-of-line in a separate TOAST table
  3. Main table row stores a pointer to the TOAST table

Main table row: [id, title, body_pointer] → fits in 8KB page
TOAST table:    [chunk_id, chunk_seq, chunk_data] → stores actual body in chunks
```

**TOAST strategies per column:**
| Strategy | Behavior | Set with |
|----------|----------|----------|
| `EXTENDED` | Compress first, then store out-of-line (default for TEXT, JSONB) | `ALTER TABLE t ALTER COLUMN c SET STORAGE EXTENDED;` |
| `EXTERNAL` | Store out-of-line without compression | Good for pre-compressed data (images) |
| `MAIN` | Try to compress, keep in main table if possible | Avoid out-of-line if data fits after compression |
| `PLAIN` | Never compress, never out-of-line | Only for small fixed-size types (integer) |

**Inspecting TOAST:**
```sql
-- Check if a table has a TOAST table
SELECT relname, reltoastrelid
FROM pg_class
WHERE relname = 'articles';

-- Size of TOAST table vs main table
SELECT pg_size_pretty(pg_relation_size('articles')) AS main_size,
       pg_size_pretty(pg_total_size('articles') - pg_relation_size('articles')) AS toast_size;
```

**Performance implications:**
- Reading a TOASTed column requires extra I/O (separate table access)
- `SELECT *` reads TOAST columns even if you don't need them → use `SELECT col1, col2`
- TOAST chunks are not covered by the main table's indexes
- VACUUM must also clean TOAST tables (autovacuum handles this)

**Rule of thumb:** TOAST is invisible in normal use — PostgreSQL handles it automatically. Know it exists for: understanding `SELECT *` performance penalty on tables with large TEXT/JSONB columns, debugging disk usage (TOAST tables can be larger than main tables), and answering interview questions about PostgreSQL's 8 KB page limit.
