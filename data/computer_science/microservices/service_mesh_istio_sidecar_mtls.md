### Service Mesh — Istio, Sidecar Pattern, mTLS

**What it gives you (vs vanilla K8s):**

| Capability | How the mesh provides it |
|---|---|
| mTLS between services | Automatic cert issuance + rotation, identity per ServiceAccount |
| Traffic shaping (canary, A/B, mirror, fault injection) | `VirtualService` + `DestinationRule` weight/match rules |
| Retries, timeouts, circuit breaking | Sidecar proxy enforces per-route policy |
| L7 authorization | `AuthorizationPolicy` against SPIFFE principal |
| Observability (RED metrics, traces, service graph) | Sidecar emits Prometheus metrics, OTel/Jaeger spans, Kiali graph |
| Rate limiting / WAF | EnvoyFilter or `RequestAuthentication` + `RateLimit` service |

**Sidecar pattern in one picture:**

```
Pod
  [App container]  <-- localhost -->  [Envoy sidecar]
                                            |
                                  (mesh-encrypted network)
                                            |
  [App container]  <-- localhost -->  [Envoy sidecar]
```

App stays untouched; iptables redirects all traffic to the sidecar, which terminates/originates TLS, applies policy, and emits telemetry.

**Istio architecture (1.5+ — single binary `istiod`):**

| Plane | Component | Responsibility |
|---|---|---|
| Data | Envoy sidecars | Per-pod proxy — does the actual work on every request |
| Data | Ingress / Egress gateways | North-south traffic into/out of the mesh |
| Control | `istiod` | Service discovery, config push, cert authority (formerly Pilot + Citadel + Galley) |

**mTLS modes (`PeerAuthentication`):**

| Mode | Server accepts | Client sends |
|---|---|---|
| `DISABLE` | Plaintext only | — |
| `PERMISSIVE` (default) | Plaintext OR mTLS | mTLS to mesh peers, plain to non-mesh |
| `STRICT` | **mTLS only** | mTLS only |

**Migration path:** start `PERMISSIVE`, observe traffic with Kiali, lock to `STRICT` namespace by namespace.

**Traffic shaping building blocks:**

| Resource | Purpose |
|---|---|
| `VirtualService` | Match rules → route weights / mirror / rewrite / retry / timeout |
| `DestinationRule` | Subsets (e.g. `v1`/`v2`) + connection-pool / outlier-detection (circuit breaker) |
| `Gateway` | Ingress / egress edge config (TLS termination, host/port binding) |
| `ServiceEntry` | Bring an external service into the mesh registry |
| `Sidecar` | Limit which services a sidecar discovers (scope reduction) |

**Common traffic patterns:**

| Pattern | `VirtualService` shape |
|---|---|
| Canary 90/10 | Two `route.destination` entries with `weight: 90` and `weight: 10` |
| Header-based A/B | `match: [{ headers: { x-user: { regex: "beta-.*" } } }]` |
| Traffic mirroring | `mirror: { host: web, subset: v2 }` |
| Fault injection | `fault: { delay: { percentage, fixedDelay } }` or `abort: { httpStatus }` |
| Retries | `retries: { attempts: 3, perTryTimeout: 2s, retryOn: 5xx,reset }` |

**Authorization policy levels:**

| Level | `selector` |
|---|---|
| Mesh-wide | (no namespace) |
| Namespace-wide | `metadata.namespace: <ns>` only |
| Workload | `selector.matchLabels: { app: api }` |

Action: `ALLOW` (default), `DENY`, `AUDIT`, `CUSTOM` (delegate to ext-authz).

Identity is **SPIFFE** principal: `cluster.local/ns/<ns>/sa/<service-account>`.

**Service mesh vs library-based resilience:**

| Aspect | Service mesh (Istio, Linkerd) | Library (Resilience4j, Hystrix) |
|---|---|---|
| Language coverage | Any (sidecar, no language SDK) | One language per library |
| Code changes | None — operator-managed | Must wrap calls in library |
| Overhead | ~0.5–1 ms per hop sidecar latency | In-process (microseconds) |
| mTLS / cert rotation | Built in | App must implement |
| Traffic shaping (canary, mirror) | Yes, declarative | No |
| Observability | Free + uniform | Per-app integration |
| Complexity | High (control plane, CRDs, debugging) | Low–medium |

**When to adopt a mesh:**

| Signal | Reason |
|---|---|
| 10+ microservices | Below that, libraries + good ingress are simpler |
| Multi-language fleet | Can't standardize on one resilience library |
| Zero-trust requirement | mTLS by default, identity per workload |
| Need canary / mirror / fault injection | Without it, build it yourself in every service |
| Already on K8s with strong platform team | Mesh assumes K8s + dedicated owners |

**Mesh comparison (one-liner):**

| Mesh | Tagline |
|---|---|
| Istio | Most features, heaviest, Envoy-based, biggest community |
| Linkerd | Simpler, lighter (Rust micro-proxy), opinionated, excellent docs |
| Cilium Service Mesh | Sidecar-less option using eBPF; sidecar still optional |
| Consul Connect | HashiCorp stack, multi-cluster, multi-runtime (VM + K8s) |

**Pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Adopting too early (< 10 services) | Operational cost > value |
| Going to `STRICT` mTLS in one shot | Breaks legacy/external traffic — go namespace by namespace |
| Ignoring sidecar resource requests | Sidecar OOM kills the pod |
| `Sidecar` resource missing | Every sidecar discovers every service in mesh — config blow-up at scale |
| Egress not modeled | External calls bypass policy/observability — use `ServiceEntry` |

**Rule of thumb:** **start with mTLS + observability**, only then traffic management. **Don't adopt below ~10 services** — operational burden exceeds payoff. **Istio = features, Linkerd = simplicity.** Migrate to `STRICT` mTLS gradually with `PERMISSIVE` as a transition mode. Budget ~1 ms per sidecar hop and a dedicated platform team to own it.
