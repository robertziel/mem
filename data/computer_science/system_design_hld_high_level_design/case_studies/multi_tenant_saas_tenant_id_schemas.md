### Multi-tenant SaaS design

There are three common approaches.

### Shared database, shared tables

- Every row has a `tenant_id`
- Simplest and most common approach
- Cheapest operationally
- Needs strong scoping discipline and isolation checks
- Gems like `ActsAsTenant` can help enforce tenant scoping

### Shared database, separate schemas

- Each tenant gets its own schema
- Better isolation than plain `tenant_id`
- Harder migrations and operational tooling

### Separate databases

- Strongest isolation
- Highest operational complexity and cost
- Useful for strict compliance or very large enterprise tenants

### What to consider

- Data isolation requirements
- Migration complexity
- Noisy-neighbor risk
- Per-tenant customization
- Billing and provisioning workflow

**Rule of thumb:** Start with `tenant_id` in shared tables unless isolation or compliance requirements clearly justify schemas or separate databases.
