### API Schemas and Validation

**What schemas do:**
- Define the shape and allowed values of requests and responses
- Make validation explicit instead of scattered across controller code
- Improve docs, code generation, and contract testing

**Validation layers:**
- Transport validation: valid JSON, correct `Content-Type`, required headers
- Schema validation: required fields, types, enums, formats, ranges
- Business validation: domain rules like "cannot cancel a shipped order"

**Common schema rules:**
- Required vs optional fields
- Nullable vs non-null fields
- String length, number ranges, regex patterns
- Enum values
- Nested object and array item validation
- Unknown field policy: ignore, reject, or store separately

**Example JSON Schema fragment:**
```json
{
  "type": "object",
  "required": ["email", "age"],
  "properties": {
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 18 },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```

**Response validation matters too:**
- Prevent accidental contract drift
- Catch missing fields after refactors
- Ensure docs/examples match real output

**Useful error shape:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {"field": "email", "message": "must be a valid email"},
      {"field": "age", "message": "must be >= 18"}
    ]
  }
}
```

**Design choices to make deliberately:**
- Can clients send unknown fields?
- Are empty strings different from `null`?
- Are enums open for future expansion?
- Is validation done before or after default values are applied?

**Gotcha:** "Optional" and "nullable" are not the same. Optional means the field may be absent. Nullable means it may be present with `null`.

**Rule of thumb:** Validate at the API boundary, return field-level errors, and keep schema rules versioned with the endpoint so request and response behavior stay predictable.
