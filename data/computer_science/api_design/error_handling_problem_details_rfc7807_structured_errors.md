### Error Handling and Problem Details

**Goals of a good API error format:**
- Human-readable enough for debugging
- Machine-readable enough for client logic
- Consistent across endpoints
- Safe to expose without leaking internals

**Problem Details shape:**
- Standardized JSON error envelope often called Problem Details
- Common fields: `type`, `title`, `status`, `detail`, `instance`
- Often extended with `code`, `trace_id`, and field-level `errors`

**Example:**
```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "One or more fields are invalid",
  "instance": "/orders/req_123",
  "code": "validation_error",
  "errors": [
    {"field": "email", "message": "must be a valid email"},
    {"field": "quantity", "message": "must be >= 1"}
  ],
  "trace_id": "req_123"
}
```

**Useful practices:**
- Keep `code` stable even if wording changes
- Include field-level errors for validation failures
- Return a request or trace ID for support/debugging
- Map errors to correct HTTP status codes

**What not to expose:**
- Raw stack traces
- SQL errors
- Secret values, tokens, internal hostnames
- Framework exception class names unless intentionally public

**Common API error categories:**
- Validation errors - 400 or 422
- Auth errors - 401 or 403
- Not found - 404
- Conflict - 409
- Rate limit - 429
- Server failures - 500, 502, 503, 504

**Common mistake:**
- Returning different shapes for `400`, `404`, and `500`, forcing clients to special-case parsing

**Gotcha:** A readable `message` alone is not enough for robust clients. Give them a stable machine-readable `code` and predictable structure.

**Rule of thumb:** Use one error envelope across the API, map it to correct status codes, and make every error response safe, searchable, and consistent.
