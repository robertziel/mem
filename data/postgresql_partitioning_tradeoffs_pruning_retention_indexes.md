### PostgreSQL Partitioning Tradeoffs

Partitioning splits one logical table into smaller physical tables based on a partition key such as `created_at`, `tenant_id`, or region.

### When partitioning helps

- **Partition pruning** -> Queries that filter by the partition key can scan fewer partitions.
- **Retention management** -> Old data can be dropped or detached by partition instead of deleting many rows.
- **Targeted maintenance** -> `VACUUM`, `ANALYZE`, `REINDEX`, and similar tasks can be done per partition.
- **Bulk lifecycle operations** -> Loading, archiving, and removing large chunks of data is easier when data is naturally grouped.

### Main tradeoffs

- **More complexity** -> You must manage partition creation, naming, indexing, and retention rules.
- **Not a universal speed boost** -> Queries that do not filter on the partition key may still scan many or all partitions.
- **Planning overhead** -> Too many partitions can slow planning and increase overhead.
- **Insert routing cost** -> Each inserted row must be routed to the correct partition.
- **Row movement on update** -> Updating the partition key can force a row to move between partitions.

### Index and constraint caveats

- Indexes are usually defined per partition, not as one global index over all rows.
- Global uniqueness is harder.
- Unique constraints usually need to include the partition key to be enforceable across the partitioned table.

### When it is a good fit

- Very large tables
- Data naturally grouped by time, tenant, or another stable key
- Queries usually filter by that key
- Retention or archive workflows matter

Example:
- Event logs, metrics, audit records, or orders partitioned by month

### When it is usually not worth it

- The table is not very large
- The real problem is missing indexes, bloat, or slow queries
- Queries rarely filter by the partition key
- You want it as a general performance switch

### Rule of thumb

Partition because you need:

- pruning by partition key
- easier retention and archival
- manageable maintenance on huge tables

Do not partition just because a table is "big enough to worry about."
