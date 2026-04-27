### AWS API Gateway

**What API Gateway does:**
- Managed API frontend for Lambda, HTTP backends, and AWS services
- Handles: routing, auth, throttling, CORS, request/response transformation

**API types:**
| Type | Protocol | Best for | Cost |
|------|----------|----------|------|
| HTTP API | HTTP | Most APIs (simpler, cheaper, faster) | ~$1/million requests |
| REST API | HTTP | Complex (WAF, usage plans, request validation) | ~$3.50/million |
| WebSocket API | WebSocket | Real-time (chat, notifications) | Per message + connection min |

**HTTP API vs REST API:**
| Feature | HTTP API | REST API |
|---------|----------|----------|
| Latency | Lower | Higher |
| Cost | ~70% cheaper | More expensive |
| JWT auth | Built-in | Lambda authorizer |
| WAF integration | No | Yes |
| Usage plans / API keys | No | Yes |
| Request validation | No | Yes |
| Caching | No | Yes (built-in) |
| Default choice | ✅ Yes | Only if you need extras |

**Lambda integration:**
```
Client → API Gateway → Lambda → Response

GET /users/123 → Lambda function receives:
{
  "pathParameters": { "id": "123" },
  "queryStringParameters": { "fields": "name,email" },
  "headers": { "Authorization": "Bearer token" },
  "body": null
}
```

**Authorization:**
| Method | How | Best for |
|--------|-----|----------|
| JWT authorizer | Validates JWT (Cognito, Auth0) | HTTP API, standard JWT auth |
| Lambda authorizer | Custom Lambda checks auth | Complex auth logic, API keys |
| IAM | AWS SigV4 signing | Service-to-service, internal |
| Cognito | User Pool authorizer | REST API + Cognito integration |

**Throttling:**
```
Account level: 10,000 requests/sec (soft limit, increase via support)
Stage level: configurable per stage
Route level: configurable per route

Burst: 5,000 concurrent requests
Throttled requests return: 429 Too Many Requests
```

**Stages and deployments:**
```
/prod  → current production deployment
/staging → testing deployment
/dev → development deployment

Each stage has its own URL:
  https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

**Custom domain:**
```
api.example.com → API Gateway custom domain → /prod stage
Requires: ACM certificate + Route53 ALIAS record
```

**CORS:**
```
HTTP API: built-in CORS configuration
REST API: enable CORS per resource (adds OPTIONS method)
```

**Rule of thumb:** HTTP API for 90% of use cases (cheaper, faster, simpler). REST API only when you need WAF, caching, usage plans, or request validation. JWT authorizer for user auth, IAM for service-to-service. Set throttling to protect your backend. Use custom domains for production APIs.
