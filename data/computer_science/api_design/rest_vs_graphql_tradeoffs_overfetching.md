### REST API vs GraphQL (short)

**REST**
- Multiple endpoints per resource.
- Server shapes responses.

**GraphQL**
- Single endpoint.
- Client specifies fields it needs.

**Trade-offs:**
- REST is simpler to cache and monitor.
- GraphQL reduces over/under-fetching but adds complexity.

**Rule of thumb:** REST for simple APIs, GraphQL for complex client-driven data needs.
