### REST vs GraphQL — Tradeoffs

**Definition:** **REST** exposes resources via HTTP verbs on multiple endpoints; the server shapes responses. **GraphQL** exposes a single endpoint where the client specifies exactly which fields it needs. Each fits different problems — and many real APIs use both.

**Side-by-side:**

| Property | **REST** | **GraphQL** |
|---|---|---|
| Endpoints | Many (one per resource) | One (`/graphql`) |
| Methods | GET, POST, PUT, PATCH, DELETE | POST (typically) |
| Response shape | Server decides | Client requests |
| Over-fetching | Common (whole resource) | None (only what's asked) |
| Under-fetching (N+1 calls) | Common | Solved (single query) |
| HTTP caching | Easy (CDN-friendly) | Harder (POST not cacheable) |
| Versioning | URL or header | Schema evolution |
| Schema | OpenAPI / informal | First-class (`schema.graphql`) |
| Type safety | OpenAPI codegen | Native (codegen common) |
| Tooling | Mature (Postman, curl, OpenAPI) | Mature (Apollo, GraphiQL, Hasura) |
| Learning curve | Low | Medium-high |
| Best fit | Simple CRUD, public APIs, server-shaped data | Many clients, varying needs |

**The over-fetching / under-fetching problem (REST):**

```
GET /api/users/42        → returns ALL fields including profile, prefs, history
                            (over-fetch: client only needed name + avatar)

GET /api/users/42        → name, avatar
GET /api/users/42/posts  → list of posts
GET /api/posts/1/likes   → likes for post 1
GET /api/posts/1/comments → comments
                          (under-fetch: 4 round trips for one screen)
```

**GraphQL solves both in one query:**

```graphql
query DashboardData($userId: ID!) {
  user(id: $userId) {
    name
    avatar
    posts(limit: 10) {
      title
      likes { count }
      comments(limit: 3) { author { name } body }
    }
  }
}
```

| Win | Detail |
|---|---|
| One round trip | Replaces N |
| Only requested fields | No over-fetch |
| Composes naturally | Client controls shape |
| Strong typing | Schema-driven |

**REST strengths:**

| Strength | Detail |
|---|---|
| HTTP caching works out of the box | CDN-friendly |
| Simple URLs are debuggable | `curl /api/users/42` |
| Familiar to all backend devs | Onboarding cost low |
| Easy to monitor per-endpoint | Standard APM tooling |
| Stateless | Each request independent |
| Versioning is well-understood | URL or header |
| Idempotent semantics | Method-defined |

**GraphQL strengths:**

| Strength | Detail |
|---|---|
| Eliminates over- and under-fetching | Especially for mobile |
| One endpoint, many shapes | Multiple clients |
| Strong typed schema | Codegen for clients |
| Schema-driven docs | Self-documenting |
| Field-level deprecation | No need to version whole API |
| Subscriptions for realtime | Built-in |
| Tooling for explorer / introspection | GraphiQL out of the box |

**Where each shines:**

| Scenario | Pick |
|---|---|
| Simple internal CRUD | **REST** |
| Public API (developers consume) | REST (with OpenAPI) |
| Mobile app on bad networks | **GraphQL** |
| Many clients with different needs | GraphQL |
| Microservices internal calls | REST or gRPC |
| Real-time subscriptions | GraphQL or WebSocket |
| Server-rendered with hypermedia (HATEOAS) | REST |
| BFF (backend for frontend) | Either; GraphQL fits well |

**REST endpoint design:**

| Pattern | Example |
|---|---|
| Collection | `GET /users` |
| Single resource | `GET /users/42` |
| Sub-resource | `GET /users/42/posts` |
| Action | `POST /orders/123/cancel` |
| Bulk | `POST /users/bulk` |
| Search | `GET /users?q=alice` |
| Pagination | `GET /users?page=2&size=50` or cursor |

**GraphQL operation types:**

| Operation | Purpose |
|---|---|
| `query` | Read (idempotent, cacheable per client) |
| `mutation` | Write (sequenced) |
| `subscription` | Realtime stream (over WebSocket) |

**Common GraphQL pitfalls:**

| Pitfall | Effect |
|---|---|
| **N+1 in resolvers** | Each field hits DB separately — use **DataLoader** to batch |
| Deep nested queries | DOS risk — limit depth or complexity |
| No HTTP caching | POST endpoint — use Apollo persisted queries + GET for caching |
| Schema growth without governance | Becomes unmanageable |
| Resolver does too much | Fat resolvers; push to services |
| All clients query everything | Persisted queries (allowlist) reduce attack surface |
| Public API exposing schema | Field-level access control needed |
| Pagination inconsistent | Use Relay cursor-connection spec |

**Common REST pitfalls:**

| Pitfall | Effect |
|---|---|
| Over-fetching (whole resource for one field) | Bandwidth, mobile pain |
| Under-fetching (many round trips) | Latency stacks |
| Endpoint sprawl | `/users/42/posts/1/comments/9/likes/...` |
| Nested vs flat | Decide one and stick |
| Inconsistent error shape | Adopt one (RFC 7807) |
| Versioning inconsistency | Pick `/v2` or `Accept` header |
| Missing filtering / pagination at start | Hard to retrofit |
| GET with mutating effects | Caches and crawlers break things |

**Hybrid patterns (common in 2026):**

| Pattern | Use |
|---|---|
| REST for public, GraphQL for internal | External devs prefer REST |
| GraphQL gateway over REST microservices | BFF aggregating REST upstreams |
| REST + sparse fieldsets (`?fields=name,avatar`) | Reduces over-fetch on REST |
| REST + JSON:API spec | Standard relations + sparse fields |
| GraphQL persisted queries | Caching + safety, removes flexibility |
| tRPC | TypeScript-only, REST-like simplicity with type safety |
| gRPC | Inter-service binary |

**Caching comparison:**

| Aspect | REST | GraphQL |
|---|---|---|
| HTTP cache | Native | Hard (POST) — needs persisted queries + GET |
| CDN | Easy | Harder |
| Field-level cache | Per-endpoint hack | Native (Apollo) |
| Per-user cache | `Vary` header | Apollo cache by query |
| Invalidation | URL-based | Field-based |

**Versioning:**

| Approach | Style |
|---|---|
| **REST** URL: `/v2/users` | Most common |
| **REST** Header: `Accept: application/vnd.x.v2+json` | Cleaner URLs |
| **GraphQL** | Schema additions; deprecate fields with `@deprecated` |

**Decision matrix:**

| Need | Pick |
|---|---|
| Simple internal CRUD | REST |
| Public API for developers | REST + OpenAPI |
| Mobile / variable needs | GraphQL |
| Many client teams sharing backend | GraphQL |
| Service-to-service inside cluster | REST or gRPC |
| Realtime feed | GraphQL Subscriptions / WebSocket / SSE |
| Strong type safety end-to-end | GraphQL or tRPC |
| HTTP caching critical | REST |
| File uploads / streaming | REST (or specialized endpoints) |

**Cross-references:**

- HTTP methods + idempotency: [http_methods_*.md](../frontend/web_fundamentals/http_methods_idempotency_get_post_put_delete_idempotent.md)
- API versioning: [api_versioning_*.md](api_versioning_url_header_compatibility.md)
- Resource modeling: [resource_modeling_*.md](resource_modeling_collections_subresources_relationships_nouns.md)
- API contracts (Pact): [contracts_*.md](contracts_pact_consumer_driven.md)

**Rule of thumb:** **REST when the server's resource shape matches client needs and HTTP caching matters; GraphQL when many clients need different shapes of the same data.** REST is simpler and CDN-friendly; GraphQL eliminates over/under-fetching but needs **DataLoader** for N+1, **persisted queries** for caching/safety, and **depth limits** for DOS. Hybrid (REST public, GraphQL internal — or GraphQL BFF over REST) is common and often the best of both.
