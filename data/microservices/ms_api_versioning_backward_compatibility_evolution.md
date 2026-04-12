### API Versioning, Backward Compatibility & Evolution

**Why API versioning matters:**
- Multiple clients depend on your API (web, mobile, third-party)
- Breaking changes can't be deployed atomically across all clients
- Need to evolve API without breaking existing consumers

**Versioning strategies:**
| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL path | `/v1/users`, `/v2/users` | Explicit, easy to route | URL pollution |
| Header | `Accept: application/vnd.api+json;v=2` | Clean URLs | Less visible |
| Query param | `/users?version=2` | Simple | Messy, cache issues |
| No versioning | Evolve carefully, never break | Simplest | Requires strict discipline |

**URL path versioning is most common** in practice (GitHub, Stripe, Twilio).

**Backward-compatible changes (safe, no new version needed):**
- Adding new fields to responses
- Adding new optional request parameters
- Adding new endpoints
- Adding new enum values (if clients handle unknown values)

**Breaking changes (require new version):**
- Removing or renaming fields
- Changing field types (string → integer)
- Changing URL structure
- Changing authentication mechanism
- Making optional field required
- Changing error format

**Expand-contract for API evolution:**
```
Phase 1 (expand): Add new field alongside old
  Response: { "name": "Alice", "full_name": "Alice Smith" }
  Both old and new clients work

Phase 2 (migrate): Update all clients to use new field
  Old clients still work (old field still present)

Phase 3 (contract): Remove old field
  Response: { "full_name": "Alice Smith" }
  Only after all clients migrated
```

**Consumer-Driven Contracts (CDC):**
- Consumers define what they expect from the API (contract tests)
- Provider runs consumer contracts in CI
- Breaking a contract fails the provider's build BEFORE deployment
- Tools: Pact, Spring Cloud Contract

```
Consumer writes: "I expect GET /users/1 to return { id: 1, name: string }"
Provider CI: runs all consumer contracts → green = safe to deploy
```

**Deprecation strategy:**
1. Mark endpoint as deprecated (header: `Deprecation: true`, docs)
2. Log usage of deprecated endpoints (identify who's still calling)
3. Notify consumers with timeline (email, changelog, API response header)
4. Monitor usage → zero traffic → remove
5. Typical timeline: 6-12 months for public APIs

**API changelog and communication:**
```
## v2.3.0 (2024-03-15)
### Added
- `GET /users/:id/preferences` endpoint
- `metadata` field on Order response

### Deprecated
- `GET /users/:id/settings` (use /preferences instead, removal: 2024-09-15)

### Breaking (v3 only)
- Removed `legacy_id` field from User response
```

**Rule of thumb:** URL path versioning for simplicity. Prefer backward-compatible changes (additive). Use expand-contract for field renames/removals. Consumer-driven contracts to catch breaks in CI. Deprecate with timeline and monitoring. Never remove a field without verifying zero usage.
