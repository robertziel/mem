### API Naming Consistency

**Consistency decisions to make once:**
- Path style: lowercase with hyphens, or lowercase with underscores
- Field style: `snake_case` or `camelCase`
- Timestamp suffixes: `created_at`, `updated_at`
- Boolean prefixes: `is_active`, `has_more`
- ID naming: `id`, `user_id`, `order_id`

**Endpoint naming:**
- Use plural resource collections: `/users`, `/orders`
- Use nouns, not verbs: `/orders` not `/createOrder`
- Use the same term everywhere: `customer`, not `customer` in one endpoint and `client` in another

**Field naming:**
- Prefer stable, explicit names over short aliases
- Keep enum values predictable: `pending`, `paid`, `failed`
- Avoid mixing styles in the same API: `createdAt` and `updated_at`

**Good vs bad examples:**
```text
Good: /order-items
Bad:  /OrderItems

Good: has_more
Bad:  moreData

Good: customer_id
Bad:  custId
```

**Naming patterns that help clients:**
- `_id` for foreign keys
- `_at` for timestamps
- `_count` for counts
- `next_cursor` for pagination cursors
- `code` for stable machine-readable error identifiers

**Where inconsistency hurts:**
- SDK generation
- Search in docs
- Analytics dashboards
- Cross-team onboarding

**Gotcha:** Renaming a field for "clarity" is still a breaking change if clients already depend on the old name.

**Rule of thumb:** Pick a naming convention early, document it, lint for it where possible, and value predictability over personal style preferences.
