### Ambassador Pattern (Proxy for Cross-Cutting Concerns)

Place a proxy alongside a service to handle common infrastructure tasks.

```
[App Container] ←localhost→ [Ambassador Proxy]
                                    |
                              handles: retry, circuit breaking,
                              logging, auth, TLS termination
                                    |
                              [External Service]
```

**How it differs from Sidecar:**
| Pattern | Scope | Example |
|---------|-------|---------|
| Ambassador | Outbound proxy (your service → external) | Proxy to legacy DB, external API |
| Sidecar | General helper alongside service | Envoy proxy, log collector, config agent |

**Example: Ambassador for legacy database**
```yaml
# Kubernetes: ambassador container in same pod
containers:
  - name: app
    image: myapp:latest
    env:
      - name: DB_HOST
        value: "localhost"  # talks to ambassador, not directly to DB
  - name: db-ambassador
    image: db-proxy:latest  # handles connection pooling, TLS, retry
    ports:
      - containerPort: 5432
```

The app thinks it's talking to a local database, but the ambassador handles connection pooling, TLS, retries, and routing to the actual database.

**Rule of thumb:** Ambassador for offloading connectivity concerns from the app to a proxy. Common in Kubernetes for legacy integrations, external service access, and protocol translation. Similar to Sidecar but focused on outbound communication.
