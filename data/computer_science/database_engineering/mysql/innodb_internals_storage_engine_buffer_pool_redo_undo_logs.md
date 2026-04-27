### MySQL InnoDB Internals (Buffer Pool, Redo / Undo Logs)

**Architecture in one picture:**

```
MySQL Server (parser, optimizer)
        │ Storage Engine API
┌───────▼─────────────────────────────────┐
│ InnoDB                                   │
│  Buffer Pool (RAM)                       │
│   data pages · index pages               │
│   change buffer · adaptive hash index    │
│  Redo Log (WAL)   Undo Log (MVCC)        │
│  Doublewrite buffer                      │
│  Tablespace files (.ibd) — disk          │
└──────────────────────────────────────────┘
```

**Component cheatsheet:**

| Component | Job | Lives | Key knob |
|---|---|---|---|
| Buffer pool | Cache data + index pages | RAM | `innodb_buffer_pool_size` (70–80% RAM on dedicated host) |
| LRU policy | Decide what to evict | RAM | Midpoint insertion at 3/8 from head — full-table scans don't flush hot pages |
| Change buffer | Defer secondary-index writes when page not in pool | Buffer pool | `innodb_change_buffer_max_size` (default 25%); only non-unique secondary indexes |
| Adaptive hash index | Auto-built hash on hot index pages | Buffer pool | `innodb_adaptive_hash_index` (ON) |
| Redo log (WAL) | Durability + crash recovery | Disk (sequential) | `innodb_redo_log_capacity` (8.0.30+); replays committed txns on crash |
| Undo log | MVCC snapshots + rollback | System tablespace | grows under long transactions; `Innodb_history_list_length` should be small |
| Doublewrite buffer | Guard against torn page writes | Disk | `innodb_doublewrite` (ON); ~5–10% write cost, prevents corruption |
| Tablespace `.ibd` | Persistent table data | Disk | `innodb_file_per_table` (ON) — one file per table |

**Storage layout:**

| Unit | Size | Contains |
|---|---|---|
| Page | 16 KB (default) | Rows or index entries |
| Extent | 64 contiguous pages = 1 MB | |
| Segment | Group of extents | One per index/data tree |
| Tablespace | Group of segments | One `.ibd` per table |

**Page types:** data (clustered-index leaves = the rows themselves), secondary index, undo, system metadata.

**Clustered index = the data, ordered by PK** — choice of PK is everything:

| PK choice | Insert pattern | Side-effect |
|---|---|---|
| `BIGINT AUTO_INCREMENT` | Sequential append | No page splits, compact |
| Random `CHAR(36)` UUID | Random insert position | Page splits everywhere; secondary indexes balloon (PK is stored in every one) |
| `BINARY(16)` via `UUID_TO_BIN(UUID(), 1)` (8.0+) | Mostly sequential (swap_flag rearranges time bits) | Compact + UUID-friendly |

> **Why secondary indexes hurt with bad PKs:** every secondary index entry stores the PK. A 36-byte string PK makes every secondary index ~4× larger than an 8-byte BIGINT.

**Write path (durability):**

```
1. Modify page in buffer pool         (memory)
2. Append to redo log buffer          (memory)
3. Flush redo log to disk on COMMIT   (durability boundary)
4. Eventually flush dirty data pages  (checkpoint, async)
```

`innodb_flush_log_at_trx_commit` — durability vs throughput dial:

| Value | On commit | Crash data loss | When to use |
|---|---|---|---|
| `1` (default) | Write + fsync to disk | None | ACID-compliant systems |
| `2` | Write to OS buffer; fsync every 1s | Up to 1s | Tolerable risk for write-heavy bulk |
| `0` | Stay in log buffer; flush every 1s | Up to 1s + buffer | Bulk loads, throwaway dev |

**MVCC mechanics:**

| Hidden row field | Holds |
|---|---|
| `DB_TRX_ID` | Last txn that wrote this row |
| `DB_ROLL_PTR` | Pointer into undo log for previous version |

A read at REPEATABLE READ walks the undo chain backward until the version visible to its snapshot is found. Long-running transactions pin the undo chain → bloat. Watch `SHOW STATUS LIKE 'Innodb_history_list_length'` (should be small; growth = long txn somewhere).

**Locking summary:**

| Lock | What it does |
|---|---|
| Shared (S) | Other readers OK; blocks writers |
| Exclusive (X) | Blocks both |
| Intent (IS / IX) | Table-level signal for row-level locking |
| Gap lock | Locks the gap between index records (prevents phantoms) |
| Next-key lock | Record + gap (default under REPEATABLE READ) |

Deadlocks are auto-detected; the cheaper txn is rolled back. Reduce them by: short txns, consistent table-access order, indexes that prevent full-range scans, dropping to READ COMMITTED if you can tolerate phantoms.

**Row formats:**

| Format | Notes |
|---|---|
| DYNAMIC (default) | Variable-length cols off-page when large — keeps data pages compact |
| COMPACT | Older form, similar |
| COMPRESSED | Compresses pages (saves disk, costs CPU) |
| REDUNDANT | Legacy, avoid |

**Monitoring (the four numbers to check):**

| Metric | How to read | Healthy |
|---|---|---|
| Buffer pool hit rate | `1 - (Innodb_buffer_pool_reads / read_requests)` | > 99% |
| `Innodb_log_waits` | Times log buffer was too small | 0 |
| `Innodb_history_list_length` | Pending undo (long-txn signal) | < 1000 |
| `SHOW ENGINE INNODB STATUS\G` | Free-form: latest deadlock, semaphores, IO | Inspect periodically |

**Rule of thumb:** buffer pool to **70–80% of RAM** on a dedicated host. Use **`BIGINT AUTO_INCREMENT`** PKs (or `UUID_TO_BIN(...,1)` if you really need UUIDs) — never random char UUIDs as PK. Keep transactions short to avoid undo bloat. Default `innodb_flush_log_at_trx_commit=1`; only drop to `2` if 1s of data loss is genuinely acceptable. Hit rate < 99% or growing `Innodb_history_list_length` are the two early warnings worth alerting on.
