### API Observability

**What to observe per endpoint:**
- Request rate
- Error rate by status code and error code
- Latency percentiles: p50, p95, p99
- Saturation signals: worker pool, DB pool, queue depth, CPU

**Three pillars in practice:**
- Metrics - fast aggregate signals for dashboards and alerts
- Logs - detailed event records for specific requests
- Traces - end-to-end path across services and dependencies

**High-value API dimensions:**
- Route or operation name
- Status code class and exact status
- Consumer/app key if safe
- Region, environment, dependency name
- Retry count, timeout, cache hit, rate-limit outcome

**Structured log example:**
```json
{
  "request_id": "req_123",
  "route": "POST /v1/orders",
  "status": 201,
  "duration_ms": 84,
  "user_id": "usr_42",
  "db_ms": 23,
  "external_api_ms": 0
}
```

**Tracing helps answer:**
- Which downstream call made the endpoint slow?
- Did retries help or amplify latency?
- Where are errors introduced across service boundaries?

**API SLO example:**
- 99.9% of `GET /v1/orders/{id}` requests succeed monthly
- 95% of requests complete in under 300 ms

**Alert on symptoms, not noise:**
- Sustained 5xx rate above threshold
- p95 latency regression on critical routes
- Large increase in 429s or auth failures
- Error budget burn, not one isolated spike

**Do not log blindly:**
- Never log secrets, tokens, raw passwords, full credit card data
- Be careful with PII in request/response bodies
- Prefer request IDs and safe identifiers over full payload dumps

**Rule of thumb:** Every request should be traceable with a request ID, every critical route should have latency and error dashboards, and every alert should tell you which endpoint is failing and why.
