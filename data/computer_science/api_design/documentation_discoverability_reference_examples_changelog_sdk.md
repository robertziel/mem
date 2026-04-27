### API Documentation and Discoverability

**Good API docs answer:**
- What this API does
- How to authenticate
- Which base URLs and environments exist
- How requests and responses look
- How errors, retries, pagination, and rate limits work

**Minimum doc set:**
- Quickstart with one copy-paste example
- Endpoint reference for every operation
- Request and response examples
- Error catalog and status code guidance
- Auth guide
- Webhook or async flow guide if applicable
- Changelog and deprecation notices

**Discoverability tools:**
- OpenAPI or Postman collection
- Searchable docs portal
- SDKs with examples
- Consistent naming and tagging
- Link related endpoints and workflows together

**Reference page checklist:**
- Method + path
- Required auth
- Path/query/body params
- Example request
- Example success response
- Example failure response
- Rate limits and idempotency notes

**What makes docs usable:**
- Real examples, not placeholder-only examples
- One canonical name for each concept
- Separate "getting started" from full reference
- Explain edge cases: pagination, retries, eventual consistency, async completion

**Common failures:**
- Docs describe fields but not meaning
- No example of error payloads
- Changelog missing, so clients cannot track changes
- Search works poorly because endpoint names and business terms do not match

**Gotcha:** Documentation is part of the API surface. If support tickets repeatedly ask the same question, the docs are incomplete even if technically accurate.

**Rule of thumb:** Optimize docs for first successful call in minutes, then for fast lookup during production debugging. Every important endpoint should have both a happy-path example and a failure-path example.
