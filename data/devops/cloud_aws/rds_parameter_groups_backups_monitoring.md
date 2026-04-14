### RDS: Parameter Groups, Backups & Monitoring

**Parameter Groups (tuning):**
```bash
# Custom parameter group for PostgreSQL
aws rds create-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --db-parameter-group-family postgres16

# Tune parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-postgres-params \
  --parameters "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory/4},ApplyMethod=pending-reboot" \
               "ParameterName=work_mem,ParameterValue=64MB,ApplyMethod=immediate"
```

Key PostgreSQL parameters to tune:
- `shared_buffers`: 25% of instance memory
- `work_mem`: 64-256 MB (depends on query complexity)
- `max_connections`: 100-500 (use PgBouncer for more)
- `effective_cache_size`: 75% of instance memory

**Instance vs cluster parameter groups (Aurora):**
- **DB parameter group**: applies to a single instance (instance-level settings)
- **DB cluster parameter group**: applies to all instances in an Aurora cluster (cluster-wide settings like `shared_buffers`)
- Aurora uses both: cluster-level for shared settings, instance-level for per-node overrides

**Automated backups:**
- Daily snapshots + transaction logs (point-in-time recovery)
- Retention: 1-35 days
- Backup window: choose low-traffic period
- Manual snapshots: persist until you delete them
- Point-in-time recovery (PITR): restore to any second within retention window

**Performance Insights:**
- Visual tool to identify database bottlenecks
- Shows: top SQL queries, wait events, load by query
- Free tier: 7 days retention
- Use to find: slow queries, lock contention, CPU-bound vs IO-bound waits

**Rule of thumb:** Always use custom Parameter Groups for tuning -- never modify the default group. Set `shared_buffers` to 25% of instance memory as a starting point. Enable Performance Insights on every production RDS instance. Set backup retention to at least 7 days. Use PgBouncer for connection pooling when you need more than ~100 connections.
