### Multi-Tenant SaaS — `tenant_id`, Schemas, Separate DBs

**Three classic isolation models:**

| Model | Detail | Isolation | Cost | Complexity |
|---|---|---|---|---|
| **Shared DB, shared tables** (`tenant_id` column) | Every row carries `tenant_id` | Logical | Lowest | Lowest |
| **Shared DB, schema-per-tenant** | Separate Postgres schemas / MySQL databases | Stronger | Medium | Medium — migrations replicate |
| **Database-per-tenant** | Fully separate DB instance | Strongest | Highest | Highest — provisioning, ops, billing |
| **Hybrid** | Pool + per-whale isolation | Tunable | Mixed | Medium |

**When to pick which:**

| Constraint | Pick |
|---|---|
| Default for most SaaS | Shared DB + `tenant_id` |
| Compliance (HIPAA / FedRAMP / per-region) | Schema-per or DB-per-tenant |
| Largest tenant ≫ all others | Hybrid: pool + per-whale isolation |
| Per-tenant custom schema | Schema-per-tenant |
| 10K+ tenants | Pool by default (DB-per is unmanageable) |
| < 100 tenants | DB-per becomes feasible |
| Multi-region / data residency | DB-per-tenant per region |

**Shared DB + `tenant_id` — the discipline:**

| Requirement | Detail |
|---|---|
| Every multi-tenant table has `tenant_id` | Required, NOT NULL |
| Every query filters by `tenant_id` | App-enforced or middleware-enforced |
| Every index includes `tenant_id` first | `(tenant_id, created_at)`, `(tenant_id, email)` |
| Every foreign key cross-checks tenancy | Avoids orphan rows |
| Authorization layer pins request to tenant | Auth middleware sets `current_tenant` |
| ORM scope by default | Rails `default_scope`, or `ActsAsTenant` gem |
| Background jobs carry `tenant_id` | Pass it through Sidekiq / queue payload |
| Tests cover cross-tenant leakage | Negative tests confirm scoping |

**Postgres Row-Level Security (RLS) — strong scope enforcement:**

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::int);

-- per-request
SET LOCAL app.tenant_id = '42';
```

| Win | Detail |
|---|---|
| Defense in depth | Even buggy app can't leak across tenants |
| Forces audit trail | Policies show in schema |
| Pair with explicit filters | Not a substitute for thinking |
| Watch | Policy evaluation cost; profile complex policies |

**Schema-per-tenant pattern:**

| Concern | Detail |
|---|---|
| Postgres `SET search_path TO tenant_42, public` | Per-connection switch |
| Migration tool | Loop over tenants; same DDL applies to each |
| Connection per tenant or per pool | Trade-off |
| Limit | Each schema has its own toast tables, indexes, planner stats — 10k+ schemas degrades |
| Tools | Apartment (Rails) — used to be popular; many teams have moved off |

**DB-per-tenant pattern:**

| Concern | Detail |
|---|---|
| Provisioning | Create DB instance / database per tenant |
| Connection routing | App must select DB by tenant |
| Migrations | Run against every tenant — migration windows balloon |
| Backups | Per-tenant — easy restore for a single tenant |
| Cost | Per-tenant overhead (instance, monitoring, backup) |
| Use cases | Enterprise contracts; regulated industries; per-region deployments |
| Failover scope | Per-tenant — better isolation |

**Hybrid pool + isolation:**

| Pattern | Detail |
|---|---|
| Default tenants in shared pool | Cheapest |
| "Premium" / "noisy" tenants get own DB | Whale isolation |
| Migration window per tier | Roll forward in waves |
| Used by | Stripe, Atlassian, Slack — large SaaS |

**Per-tenant noisy-neighbor mitigations (shared model):**

| Lever | Detail |
|---|---|
| Per-tenant rate limits | At API gateway |
| Per-tenant quotas | DB connection pool slice |
| Per-tenant queue partitioning | Don't let one tenant's job storm starve others |
| Resource attribution | Log + metric tag every operation with `tenant_id` |
| Hot-tenant isolation | Move noisy tenant to its own pool / DB |
| QoS / priority classes | Critical operations bypass rate limits |
| Per-tenant cache space | Bounded, evicted independently |

**Common per-tenant features:**

| Feature | Approach |
|---|---|
| Per-tenant feature flags | `tenant_id` → flag config |
| Per-tenant rate limits | Middleware reads tenant config |
| Per-tenant subdomains | `acme.app.com` → routes to tenant 42 |
| Per-tenant custom domains | DNS + cert per domain (consider ACM SNI) |
| Per-tenant branding / theming | Config-driven UI |
| Per-tenant data export / GDPR delete | Single-tenant SQL paths simplify |

**Identifying the tenant per request — three sources:**

| Source | Detail |
|---|---|
| Subdomain | `acme.app.com` → tenant `acme` |
| Path prefix | `/t/acme/...` |
| API key / JWT claim | `tenant_id` embedded in auth token |
| Custom domain → tenant lookup | DNS + reverse-lookup table |

**Migration strategies under multi-tenancy:**

| Approach | Detail |
|---|---|
| Single shared schema | One migration, all tenants instantly affected |
| Schema-per-tenant | Loop or batch; downtime per tenant manageable |
| DB-per-tenant | Run rolling windows; very long total wall-clock |
| **Online + backward-compatible** | Required for any model — never break in-flight clients |
| Migration framework | strong_migrations (Rails) lints risky changes |

**Backups & restore granularity:**

| Model | Restore granularity |
|---|---|
| Shared / `tenant_id` | Full DB restore + filter — hard to restore one tenant |
| Schema-per | Per-schema backup possible |
| DB-per | Per-tenant restore trivial |

> If "restore one tenant's data" is a real requirement, lean toward schema-per or DB-per.

**Auth / authorization integration:**

| Concept | Detail |
|---|---|
| User → Tenant relationship | Many-to-many often (consultants, agencies) |
| Active tenant per session | Set in cookie / JWT claim |
| Role per tenant | User can be admin in one tenant, member in another |
| Cross-tenant queries (admin only) | Tightly audited |
| Internal staff impersonation | Audit log every "act as" action |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting `tenant_id` in a `WHERE` clause | Cross-tenant data leak |
| Forgetting `tenant_id` in an index | Per-tenant queries scan globally |
| Missing `tenant_id` in a unique constraint | Email collision across tenants |
| Sharing IDs (sequential auto-increment) across tenants | Enumeration risk; use UUIDs / per-tenant prefixes |
| Big tenant clogs shared pool | Move them to dedicated infra |
| RLS without testing | Policies that allow more than intended |
| Migration assumed to be instant — but actually lock | Use online migration tools |
| Debug logs without `tenant_id` tag | Hard to attribute issues |
| Sandbox / impersonation without audit | Privacy issue if misused |
| Caching by global key (no tenant in key) | Cross-tenant cache poisoning |

**Observability — every metric / log / trace tagged with `tenant_id`:**

| Signal | Detail |
|---|---|
| Logs | `tenant_id` field always |
| Metrics | Tenant **on traces**, not on Prometheus labels (cardinality kills metrics) |
| Traces | OTel attribute `tenant.id` |
| Per-tenant dashboards | Filter by attribute in Grafana / Datadog |
| Per-tenant cost attribution | For billing / capacity planning |

> **Tenant ID is high-cardinality**, so put it on **traces** and **logs**, not on Prometheus labels.

**Security boundary checklist (shared model):**

| Check | Pass? |
|---|---|
| Every multi-tenant table has `tenant_id NOT NULL` | ✅ |
| Every multi-tenant query filters by `tenant_id` | ✅ |
| ORM has a default tenant scope | ✅ |
| Authorization layer pins `current_tenant` per request | ✅ |
| RLS or equivalent defense-in-depth in DB | ✅ |
| Background jobs propagate `tenant_id` | ✅ |
| Caches keyed by `(tenant_id, key)` | ✅ |
| Indexes start with `tenant_id` | ✅ |
| Unique constraints include `tenant_id` | ✅ |
| Cross-tenant queries explicitly audited | ✅ |
| Tests cover cross-tenant leakage | ✅ |
| Logs / traces tagged with `tenant_id` | ✅ |

**Tools / libraries:**

| Stack | Library |
|---|---|
| Rails | `acts_as_tenant`, `ros-apartment` (legacy schema-per), `multi_tenant` |
| Django | `django-tenants`, `django-organizations` |
| Laravel | `tenancy/tenancy`, `stancl/tenancy` |
| Node | row-level scoping libraries; custom middleware |
| Postgres | RLS + `app.tenant_id` setting + `pgbouncer` per-tenant pool |
| K8s | one namespace per tenant for heavy isolation |

**Cross-references:**

- DB sharding strategies: [sharding_strategies_*.md](../../database_engineering/sharding_strategies_consistent_hashing_partition_key.md)
- Authorization patterns: [zero_trust_*.md](../../devops/security/zero_trust_network_security.md)
- Capacity per-tenant: [capacity_planning_*.md](../../devops/reliability_incident_management/capacity_planning_auto_scaling_autoscaling.md)

**Rule of thumb:** **start with shared DB + `tenant_id`** (cheapest, most operationally simple). Pair with **disciplined scoping** (ORM defaults + auth pinning + RLS as defense in depth). **Move to schema-per or DB-per** only when **compliance, restore granularity, or whale isolation** demands it. **Always**: indexes start with `tenant_id`, every log/trace tagged with it, unique constraints include it.
