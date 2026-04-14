### PostgreSQL Backup Strategies

**Backup types:**
| Type | Tool | What | Size | Speed |
|------|------|------|------|-------|
| Logical | `pg_dump` | SQL statements or custom format | Smaller | Slower (rebuild) |
| Physical | `pg_basebackup` | Byte-for-byte copy of data files | Larger | Faster (copy files) |
| Continuous | WAL archiving | Stream of changes (for PITR) | Incremental | Continuous |

**pg_dump (logical backup):**
```bash
# Dump single database (custom format — compressed, parallel restore)
pg_dump -Fc -j4 -d mydb -f backup.dump

# Dump specific tables
pg_dump -Fc -d mydb -t users -t orders -f partial.dump

# SQL format (human-readable but slower restore)
pg_dump -d mydb -f backup.sql

# Schema only (no data)
pg_dump -d mydb --schema-only -f schema.sql

# Data only (no schema)
pg_dump -d mydb --data-only -f data.sql

# All databases
pg_dumpall -f all_databases.sql
```

**pg_restore (restore logical backup):**
```bash
# Restore custom format (parallel)
pg_restore -j4 -d mydb backup.dump

# Restore to a different database name
createdb newdb
pg_restore -d newdb backup.dump

# Restore specific table
pg_restore -d mydb -t users backup.dump

# List contents of dump
pg_restore -l backup.dump
```

**pg_basebackup (physical backup):**
```bash
# Full physical backup (for PITR or standby setup)
pg_basebackup -D /backup/base -Ft -z -P -X stream
#  -D: destination directory
#  -Ft: tar format
#  -z: compress
#  -P: show progress
#  -X stream: include WAL needed for consistency
```

**Point-in-Time Recovery (PITR):**
```
1. Continuous WAL archiving to S3/NFS:
   archive_mode = on
   archive_command = 'aws s3 cp %p s3://wal-archive/%f'

2. Take periodic base backups (daily/weekly)

3. To recover:
   a. Restore base backup
   b. Configure recovery target:
      recovery_target_time = '2024-01-15 10:30:00'
   c. PostgreSQL replays WAL up to that timestamp
   d. Database restored to exact moment
```

**Backup strategy by environment:**
| Environment | Strategy | RPO | RTO |
|-------------|----------|-----|-----|
| Development | pg_dump daily | 24 hours | Hours |
| Staging | pg_dump daily | 24 hours | Hours |
| Production | pg_basebackup + WAL archiving | Minutes | Minutes-hours |
| Critical prod | Streaming replica + WAL archive + pg_dump | Seconds | Minutes |

**RDS/Aurora backups (managed):**
- Automated daily snapshots (up to 35 days retention)
- Point-in-time restore to any second within retention
- Manual snapshots (persist indefinitely)
- Cross-region snapshot copy for DR

**Testing backups:**
```bash
# ALWAYS test that you can restore
createdb test_restore
pg_restore -d test_restore backup.dump
# Run some queries to verify data integrity
psql -d test_restore -c "SELECT COUNT(*) FROM users;"
dropdb test_restore
```

**Rule of thumb:** `pg_dump` for small/medium databases and table-level restore. `pg_basebackup` + WAL archiving for production PITR. Test restores regularly — an untested backup is not a backup. In AWS, use RDS automated backups + manual snapshots. Keep at least one backup off-site (cross-region).
