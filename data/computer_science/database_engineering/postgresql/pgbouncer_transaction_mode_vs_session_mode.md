### PgBouncer — Transaction Mode vs Session Mode

**Definition:** **PgBouncer** is a lightweight Postgres connection pooler. The pool mode controls **how long an app connection borrows a server connection** — `transaction` (per-transaction), `session` (per-client-session), or `statement` (per-statement, rare). The choice trades **multiplexing** for **session-state safety**.

**Three pool modes:**

| Mode | Server connection held for | Multiplexing | Compatibility |
|---|---|---|---|
| **`session`** | Whole client session (until disconnect) | Lowest — 1:1 | Highest — supports all features |
| **`transaction`** (default for web apps) | Duration of one transaction | High — N clients : M servers | Most features; some prepared-statement / session-state caveats |
| **`statement`** | Single statement | Highest | Very limited — multi-statement TX broken |

**The multiplexing win:**

```
Without pooler:                 With PgBouncer (transaction mode):
  500 app connections             500 app connections
  → 500 Postgres backends         → PgBouncer
  → 500 × ~10MB = 5GB RAM         → 50 Postgres backends
  → Postgres struggles            → 500 MB RAM, healthy Postgres
```

| Property | Detail |
|---|---|
| Postgres backend cost | ~5–10 MB resident, ~1ms to fork |
| App can have 500+ idle connections | All share the same 50 servers |
| Server side stays small | Postgres throughput remains optimal |

**What "session state" includes (and breaks in transaction mode):**

| Feature | Session-state? | Behavior in transaction mode |
|---|---|---|
| `SET local` | No (TX-scoped) | ✅ Works |
| `SET` (session-level) | **Yes** | ❌ Lost when TX returns server to pool |
| Temp tables (`CREATE TEMP TABLE`) | **Yes** (default) | ❌ Lost; use `ON COMMIT DROP` instead |
| `LISTEN / NOTIFY` | **Yes** | ❌ Doesn't work — needs persistent connection |
| Advisory locks | **Yes** | ❌ Released when server returns to pool |
| Prepared statements (PREPARE … EXECUTE) | **Yes** | ❌ Cached on the server, lost across pool returns |
| `WITH HOLD` cursors | **Yes** | ❌ Don't survive TX |
| Sequences (`nextval`) | No | ✅ Works |
| Server-side variables (`@@`) | **Yes** | ❌ Reset between checkouts |
| `SET ROLE` | **Yes** | ❌ Use with care |

> **Key rule:** in transaction mode, **anything that survives a transaction won't survive a pool checkout**.

**Prepared statements — the ongoing pain point:**

| Driver / approach | Effect under transaction mode |
|---|---|
| Old default (PostgreSQL `PREPARE`) | Cached on backend → broken |
| Disable server-side prepares | Works but slower (parse every time) |
| **PgBouncer 1.21+** with `server_lifetime = ...` and `max_prepared_statements = N` | **Works** — PgBouncer caches them |
| Connection pooler in app (HikariCP, Rails reaper) | Different layer; doesn't replace PgBouncer |
| Use protocol-level prepared (`prepare_threshold` in libpq) | Often the culprit when prepared statements break |

**`session` mode — when it's actually needed:**

| Need | Why session mode |
|---|---|
| `LISTEN / NOTIFY` (Postgres pub/sub) | Needs persistent connection to receive notifications |
| Long-lived advisory locks across statements | Released on pool return otherwise |
| Tools that depend on session GUCs | `SET search_path = ...` for the whole session |
| Some ORMs that use server-side state heavily | Less common in 2026 |
| Connection-bound replication features | `pg_basebackup`, replication slots |

**`statement` mode — when it might fit:**

| Need | Detail |
|---|---|
| Pure stateless SELECT-only workloads | Highest multiplexing |
| Dashboards / analytics gateways | If no multi-statement TX needed |
| Almost never for OLTP | Multi-statement TX is fundamental |

**Real-world Rails defaults:**

| Setting | Value |
|---|---|
| `pool_mode` | `transaction` |
| `default_pool_size` | ~20 |
| `max_client_conn` | High (1000s) |
| `server_lifetime` | 3600s |
| `server_idle_timeout` | 600s |
| `max_prepared_statements` | 100 (PgBouncer 1.21+) |

**Architecture sketch:**

```
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │  App pod 1   │ │  App pod 2   │ │  App pod 3   │
            │ 50 conns     │ │ 50 conns     │ │ 50 conns     │
            └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                   └────────────────┴────────────────┘
                                    │
                              ┌─────▼──────┐
                              │  PgBouncer │ ← transaction mode pool
                              │  20 backend│
                              │  servers   │
                              └─────┬──────┘
                                    │
                              ┌─────▼──────┐
                              │  Postgres  │
                              └────────────┘
```

**Where PgBouncer sits in the stack:**

| Layer | Role |
|---|---|
| App pool (Rails / Django / Hibernate) | Per-pod max connections |
| **PgBouncer** | Multiplex many client conns → few server conns |
| Postgres | Actual backend processes |

> Both pools matter. App pool sizes the worker concurrency; PgBouncer pool sizes the database concurrency.

**Configuration knobs:**

| Setting | Detail |
|---|---|
| `pool_mode` | `session` / `transaction` / `statement` |
| `default_pool_size` | Server conns per (database, user) |
| `max_client_conn` | Clients PgBouncer accepts |
| `reserve_pool_size` | Extra conns when load spikes |
| `server_lifetime` | Recycle backends every N seconds |
| `server_idle_timeout` | Close idle backends |
| `query_timeout` | Kill queries running longer than N |
| `application_name_add_host` | Attach client host to `application_name` |
| `auth_type` | `md5`, `scram-sha-256`, etc. |

**Failure modes:**

| Failure | Effect | Mitigation |
|---|---|---|
| `LISTEN` silently doesn't deliver | Pub/sub broken | Use `session` mode for notify path |
| Advisory lock disappears | Race conditions | `session` mode or DB-level row lock |
| `SET search_path` ignored | Wrong schema | Use `SET LOCAL` or include schema in queries |
| Prepared statement "does not exist" | Driver cached it on a different backend | Update PgBouncer to 1.21+ or disable prepared |
| Long TX holds backend | Pool starvation | `query_timeout`, `idle_in_transaction_session_timeout` |
| `max_client_conn` reached | "Server too busy" | Bump max, or scale PgBouncer |

**Decision matrix:**

| Need | Pool mode |
|---|---|
| Rails / Django web app, normal traffic | **`transaction`** |
| LISTEN/NOTIFY, advisory locks across statements | **`session`** |
| Mixed workload | Two PgBouncer pools (one per DB user) |
| Pure SELECT analytics | `transaction` (or `statement` if you're sure) |
| Need full Postgres feature set, low scale | `session` |

**Alternatives & adjacent tools:**

| Tool | Where it fits |
|---|---|
| **PgCat** | Modern PgBouncer alternative, prepared-statement aware, query routing |
| **Odyssey** (Yandex) | Multi-threaded PgBouncer-like |
| **Supavisor** (Supabase) | Cloud-scale connection pooler |
| **Aurora RDS Proxy** | Managed alternative on AWS |
| **App-side pooling alone** | Insufficient at scale — Postgres still pays per-backend cost |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using `SET` instead of `SET LOCAL` in transaction mode | State lost; surprising bugs |
| Long-running TX | Drains the pool |
| Same DB user across multiple pools | Migrations starve traffic |
| `auth_user` not set | Per-user pool, less multiplexing |
| Forgetting to monitor pool waits | Latency spikes invisibly |
| Bumping `max_client_conn` without bumping FD ulimit | PgBouncer crashes |
| Putting PgBouncer on the app server | Network hop saved, but single-process bottleneck |

**Observability essentials:**

| Metric | Why |
|---|---|
| `cl_active`, `cl_waiting` | Are clients waiting? |
| `sv_active`, `sv_idle` | Server pool utilization |
| `maxwait` | Longest current wait — alert on it |
| Query duration histogram | TX-mode users care more about p99 |
| `SHOW POOLS` / `SHOW STATS` | PgBouncer admin console |

**Cross-references:**

- Postgres locking + transactions: [locking_*.md](locking_optimistic_vs_pessimistic.md)
- Slow-query workflow: [slow_query_*.md](slow_query_optimization_explain_analyze_pg_stat.md)
- DB connection pooling principles: [connection_pooling_*.md](../connection_pooling_app_db_strategies.md)

**Rule of thumb:** **Use `transaction` mode for normal web apps** — it's the default and the multiplexing win is large. **Switch to `session` mode** only when you depend on connection-scoped features (LISTEN/NOTIFY, advisory locks, session GUCs) — and consider running **two PgBouncer pools** so the rest of the app keeps the multiplexing benefit. Always prefer **`SET LOCAL`** over `SET`, and **monitor `maxwait`** as your pool-saturation signal.
