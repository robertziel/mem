### `pgslice` vs `pg_partman` (short)

Both help with PostgreSQL partitioning, but they solve slightly different problems.

### `pgslice`

- External CLI tool
- Good for migrating an existing table to time-based range partitioning
- Does not require installing a PostgreSQL extension on the server
- Best when you want a simpler, app-driven migration workflow

### `pg_partman`

- PostgreSQL extension
- Better for ongoing partition lifecycle management
- Handles partition creation, retention, and maintenance more automatically
- Best when partitioning is a long-term operational concern

### Main tradeoff

- **`pgslice`** -> Simpler migration path, less server-side setup, narrower scope
- **`pg_partman`** -> More automation and control, but more operational setup

### Rule of thumb

- Use **`pgslice`** when you mainly need to partition an existing busy table with minimal DB-server changes.
- Use **`pg_partman`** when you want PostgreSQL to manage partitions over time as part of normal operations.
