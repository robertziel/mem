### HTTP Status Codes Deep Reference

**1xx — Informational (rare in practice):**
| Code | Name | When |
|------|------|------|
| 100 | Continue | Client should continue sending body (large uploads) |
| 101 | Switching Protocols | Upgrading to WebSocket (`Upgrade: websocket`) |

**2xx — Success:**
| Code | Name | When to use | Example |
|------|------|-------------|---------|
| 200 | OK | Generic success (GET, PUT, PATCH) | `GET /users/1` returns user |
| 201 | Created | Resource created (POST) | `POST /users` → include `Location` header |
| 202 | Accepted | Request queued for async processing | Job enqueued, not yet completed |
| 204 | No Content | Success with empty body (DELETE, PUT) | `DELETE /users/1` → no body |

**Common mistake:** returning 200 for everything. Use 201 for creation, 204 for deletion.

**3xx — Redirection:**
| Code | Name | When to use | Caching |
|------|------|-------------|---------|
| 301 | Moved Permanently | URL permanently changed | Cached by browsers, SEO passes |
| 302 | Found | Temporary redirect (legacy) | Not cached reliably |
| 303 | See Other | Redirect after POST (PRG pattern) | Always GET the redirect |
| 304 | Not Modified | Client cache is still valid (ETag/If-Modified-Since) | No body sent |
| 307 | Temporary Redirect | Like 302 but preserves HTTP method | Method preserved |
| 308 | Permanent Redirect | Like 301 but preserves HTTP method | Method preserved |

**301 vs 302:** 301 = permanent (Google updates index). 302 = temporary (keep old URL in index).
**307 vs 302:** 307 guarantees method is preserved. 302 historically allowed method change.

**4xx — Client Error:**
| Code | Name | When to use | Example |
|------|------|-------------|---------|
| 400 | Bad Request | Malformed syntax, can't parse | Invalid JSON body, missing required field in wrong format |
| 401 | Unauthorized | Not authenticated (no/invalid token) | Missing `Authorization` header, expired JWT |
| 403 | Forbidden | Authenticated but not authorized | User tries to access admin endpoint |
| 404 | Not Found | Resource doesn't exist | `GET /users/999` when user 999 doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported on endpoint | `DELETE /login` not defined |
| 406 | Not Acceptable | Can't satisfy `Accept` header | Client wants XML but API only serves JSON |
| 409 | Conflict | State conflict | Duplicate resource, version conflict (optimistic locking) |
| 410 | Gone | Resource permanently deleted | Deprecated API endpoint |
| 413 | Payload Too Large | Request body exceeds limit | File upload too big |
| 415 | Unsupported Media Type | Wrong `Content-Type` | Sending XML when endpoint expects JSON |
| 422 | Unprocessable Entity | Valid syntax but semantic error | Validation failed: email format invalid |
| 429 | Too Many Requests | Rate limited | Include `Retry-After` header |

**Key distinctions interviewers ask:**

**400 vs 422:**
```
400: Can't parse the request at all (malformed JSON, missing Content-Type)
422: Parsed successfully but data is semantically invalid (email format wrong, age < 0)

Rule: 400 = "I can't understand you." 422 = "I understand you, but this is wrong."
In Rails: 400 = ActionController::BadRequest. 422 = ActiveRecord validation failure.
```

**401 vs 403:**
```
401: "Who are you?" (not authenticated, need to log in)
403: "I know who you are, but you can't do this." (authenticated, not authorized)

401 → client should authenticate (show login)
403 → don't retry, user lacks permission
```

**404 vs 410:**
```
404: "Not found" (might exist later, or never existed)
410: "Gone" (explicitly deleted, won't be back)

404 → client may retry later
410 → client should remove references (search engines de-index)
```

**409 — Conflict scenarios:**
```ruby
# Duplicate creation
POST /users { email: "taken@example.com" }
# 409 Conflict: "Email already exists"

# Optimistic locking failure
PUT /posts/1 { version: 3, title: "Updated" }
# 409 Conflict: "Resource was modified (current version: 4)"

# State transition conflict
POST /orders/1/ship
# 409 Conflict: "Order is already shipped"
```

**5xx — Server Error:**
| Code | Name | When | Common cause |
|------|------|------|-------------|
| 500 | Internal Server Error | Unhandled exception | Bug in code, nil reference, unhandled error |
| 502 | Bad Gateway | Upstream returned invalid response | App server crashed, upstream timeout |
| 503 | Service Unavailable | Server temporarily overloaded | Deployment in progress, rate limiting self |
| 504 | Gateway Timeout | Upstream didn't respond in time | Slow DB query, downstream service hung |

**502 vs 503 vs 504 (most asked):**
```
502: "I asked the upstream server and got garbage back."
     → Nginx got a bad response from Puma (app crashed, segfault)
     → Fix: check app server logs, restart app

503: "I'm alive but can't serve right now."
     → Server overloaded, in maintenance, or throttling
     → Fix: scale up, wait for deployment to finish
     → Include Retry-After header

504: "I asked the upstream server and it didn't respond in time."
     → Nginx timed out waiting for Puma (slow query, blocking call)
     → Fix: optimize slow endpoint, increase timeout, add timeout to downstream calls
```

**Rails status code mapping:**
```ruby
render json: data, status: :ok                    # 200
render json: data, status: :created               # 201
head :no_content                                   # 204
render json: errors, status: :bad_request          # 400
render json: { error: "Unauthorized" }, status: :unauthorized   # 401
render json: { error: "Forbidden" }, status: :forbidden         # 403
render json: { error: "Not found" }, status: :not_found         # 404
render json: { error: "Conflict" }, status: :conflict           # 409
render json: { errors: user.errors }, status: :unprocessable_entity  # 422
render json: { error: "Rate limited" }, status: :too_many_requests   # 429
```

**Response headers to pair with status codes:**
```
201 Created     → Location: /users/123
301 Redirect    → Location: /new-url
304 Not Modified → (empty body, client uses cache)
401 Unauthorized → WWW-Authenticate: Bearer
429 Rate Limited → Retry-After: 30
                   X-RateLimit-Limit: 100
                   X-RateLimit-Remaining: 0
503 Unavailable  → Retry-After: 60
```

**Rule of thumb:** 200 for reads, 201 for creates (with Location header), 204 for deletes. 400 for unparseable requests, 422 for validation errors. 401 = not logged in, 403 = not allowed. 502 = upstream crashed, 503 = overloaded, 504 = upstream too slow. Always return a JSON error body with a human-readable message.
