### OpenAPI Specification

**What OpenAPI is:**
- Standard machine-readable description for HTTP APIs
- Formerly associated with Swagger tooling
- Used for docs generation, client SDK generation, mocking, validation, and testing

**Core sections:**
- `openapi` - spec version
- `info` - title, version, description
- `servers` - base URLs
- `paths` - endpoints and operations
- `components` - reusable schemas, parameters, responses, security schemes
- `security` - auth requirements

**Minimal example:**
```yaml
openapi: 3.1.0
info:
  title: Orders API
  version: 1.0.0
paths:
  /orders/{id}:
    get:
      summary: Get one order
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Order found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
components:
  schemas:
    Order:
      type: object
      required: [id, status]
      properties:
        id:
          type: string
        status:
          type: string
```

**Why teams use it:**
- Single source of truth for operations and schemas
- Interactive docs like Swagger UI or Redoc
- Generate SDKs, mocks, and test cases
- Catch drift between implementation and documentation

**What to model well:**
- Request and response examples
- Error responses, not only `200`
- Auth schemes: API key, bearer token, OAuth 2.0
- Pagination params and response metadata
- Nullable, optional, deprecated, and enum fields

**Common mistakes:**
- Spec says `string`, implementation returns number
- Docs cover only success responses
- Generated spec exists but no one reviews it in PRs
- Spec is updated after deployment, so it lags reality

**Gotcha:** A stale OpenAPI file is worse than no spec because consumers trust it and build against the wrong behavior.

**Rule of thumb:** Keep the OpenAPI spec in version control, review it with code changes, and make every externally visible endpoint and error shape traceable to the spec.
