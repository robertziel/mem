### Service Mesh: Istio, Sidecar Pattern & mTLS

**What a service mesh does:**
- Manages service-to-service communication transparently
- Features: mTLS, traffic management, observability, retries, circuit breaking
- Application code doesn't change — mesh handles it at infrastructure level

**Sidecar pattern:**
```
Pod:
  [App Container] <--localhost--> [Envoy Sidecar Proxy]
                                        |
                                   (mesh network)
                                        |
  [App Container] <--localhost--> [Envoy Sidecar Proxy]
```
- Every service pod gets an Envoy proxy sidecar
- All traffic goes through the sidecar (intercepted via iptables)
- Sidecar handles: TLS, retry, circuit breaking, metrics, tracing

**Istio architecture:**
```
Data Plane:
  [Service A + Envoy] <-> [Service B + Envoy] <-> [Service C + Envoy]

Control Plane (istiod):
  - Pilot: service discovery, traffic routing config
  - Citadel: certificate management, mTLS
  - Galley: configuration validation
```

**Key features:**

**mTLS (mutual TLS):**
- Automatic encryption between all services
- Both client and server authenticate via certificates
- Zero-trust: every service verifies the other's identity
- Istio auto-rotates certificates
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT  # all traffic must be mTLS
```

**Traffic management:**
```yaml
# Canary deployment: 90% to v1, 10% to v2
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: web
spec:
  hosts: [web]
  http:
    - route:
        - destination:
            host: web
            subset: v1
          weight: 90
        - destination:
            host: web
            subset: v2
          weight: 10
```

**Observability (free with mesh):**
- Distributed tracing (Jaeger) — automatic span injection
- Metrics (Prometheus) — request rate, error rate, latency per service
- Service graph (Kiali) — visualize traffic flow between services

**Authorization policies:**
```yaml
# Only frontend can call the API service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-policy
spec:
  selector:
    matchLabels:
      app: api
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/frontend"]
```

**Service mesh vs library-based (Hystrix, Resilience4j):**
| Feature | Service mesh | Library |
|---------|-------------|---------|
| Language agnostic | Yes | No (per-language) |
| Code changes | None | Must integrate |
| Overhead | Sidecar latency (~1ms) | In-process (less overhead) |
| Features | mTLS, traffic mgmt, observability | Circuit breaking, retry |
| Complexity | High (control plane, CRDs) | Low-medium |

**When to use a service mesh:**
- 10+ microservices
- Need mTLS / zero-trust between services
- Multiple languages/frameworks (can't standardize on one library)
- Need traffic management (canary, fault injection, mirroring)

**Rule of thumb:** Service mesh adds complexity — don't adopt until you have enough services to justify it (10+). Istio is the most feature-rich but heaviest. Linkerd is simpler and lighter. Start with mTLS and observability, then add traffic management. The sidecar adds ~1ms latency per hop.
