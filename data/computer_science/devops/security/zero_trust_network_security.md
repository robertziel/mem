### Zero Trust & Network Security

**Definition:** "Never trust, always verify." Every request is authenticated, authorized, and encrypted **regardless of network location**. Trust is a property of identity + device + context — not of being "inside the network."

**Mindset shift — perimeter vs zero trust:**

| | **Perimeter / castle-and-moat** | **Zero Trust** |
|---|---|---|
| Trust model | Trust the inside, distrust the outside | Trust nothing; verify every request |
| Network role | Wall + gate | Encrypted transport, no implicit trust |
| Lateral movement (attacker inside) | Free roam | Blocked at every hop |
| User access | VPN onto the corporate network | Per-app, identity-bound, no broad network access |
| Service-to-service | Often plain HTTP inside | mTLS by default |
| Access basis | Network location (IP, subnet) | Identity + device + posture + context |
| Default rule | Allow inside | **Deny by default** |

**Three core principles (Microsoft / Forrester / NIST 800-207 alignment):**

| # | Principle | What it means |
|---|---|---|
| 1 | **Verify explicitly** | Every request authenticates + authorizes against multiple signals (identity, device, location, time, posture) |
| 2 | **Least-privilege access** | Just-in-time, just-enough — short-lived, scoped credentials |
| 3 | **Assume breach** | Segment, encrypt end-to-end, log everything, look for lateral movement |

**Identity is the new perimeter — sources to verify:**

| Signal | Used for |
|---|---|
| **User identity** | Who? — IdP (Okta, Entra, Google) via OIDC/SAML, MFA enforced |
| **Device identity** | What hardware? — managed endpoint, attested device, certificate |
| **Device posture** | Is it healthy? — patched OS, EDR running, encrypted disk |
| **Service identity** | Workload — SPIFFE / mTLS cert / IAM role |
| **Context** | Where, when, behavior pattern |
| **Risk score** | Composite — Conditional Access, IdP risk engines |

**Pillars of a zero-trust deployment (NIST 800-207):**

| Pillar | What gets enforced |
|---|---|
| **Identity** | MFA + IdP federation, no shared accounts |
| **Devices** | Device trust + posture checks before access |
| **Networks** | Microsegmentation, encryption everywhere |
| **Applications & workloads** | Per-workload identity (SPIFFE), per-call authorization |
| **Data** | Classification + DLP + encryption at rest with KMS |
| **Visibility & analytics** | Logs centralized, behavioral analysis |
| **Automation & orchestration** | Policy-as-code; revoke on signal change |

**Service-to-service trust — pick by environment:**

| Mechanism | Where |
|---|---|
| **mTLS via service mesh** (Istio, Linkerd, Consul Connect) | Kubernetes; auto-rotating SPIFFE identities per workload |
| **mTLS via API gateway** | Traditional services / VMs |
| **IAM roles** (AWS / GCP / Azure) | Cloud-internal calls |
| **OIDC ID tokens** | App-to-app over the public internet |
| **Workload Identity Federation** | GitHub Actions / GitLab CI to cloud (no static keys) |
| **SPIFFE / SPIRE** | Cross-platform workload identity standard |

**User access — moving past the VPN:**

| Approach | Example | Tradeoff |
|---|---|---|
| **VPN** | OpenVPN, AnyConnect, IPsec | "On the network" → broad access; not zero trust |
| **Mesh VPN** | Tailscale, WireGuard + identity layer | Per-peer, identity-aware; better than legacy VPN |
| **Identity-Aware Proxy** | Google IAP, AWS Verified Access, Cloudflare Access | Per-app HTTPS gate; no L3 access |
| **BeyondCorp pattern** | Per-app, per-device, per-user verification | The reference zero-trust user-access model |
| **ZTNA** (Zero-Trust Network Access) | Zscaler, Netskope, Palo Alto Prisma | Commercial cloud-delivered ZTNA |

> **VPNs aren't zero trust** — they just relocate the perimeter. They can be a transitional step, not the destination.

**Network segmentation — ladder from coarse to fine:**

| Granularity | Mechanism |
|---|---|
| Region / VPC | Separate cloud networks |
| Subnet | Public vs private subnets, NAT gateway egress |
| Security group / NSG | Allow lists between groups (cloud-native) |
| Host firewall | iptables / nftables / Windows Firewall per host |
| **Pod-level** (K8s) | NetworkPolicy default-deny + targeted allow |
| **Service-mesh L7 authz** | Istio / Linkerd policies referencing service identity, paths, methods |
| **Per-call authorization** | App / API gateway checks JWT claims on every request |

**Kubernetes zero-trust recipe:**

| Layer | Control |
|---|---|
| Namespace isolation | One NS per workload group; quotas + LimitRange |
| **Default-deny NetworkPolicy** in every namespace | `podSelector: {}` + `policyTypes: [Ingress, Egress]` |
| Explicit allow rules | From specific labels / namespaces |
| **Pod Security Admission** at `restricted` | Drop ALL caps, runAsNonRoot, RuntimeDefault seccomp |
| **Service mesh mTLS in `STRICT` mode** | All east-west traffic encrypted + identified |
| **AuthorizationPolicy** | SPIFFE-principal-based per-route allow lists |
| Image signing + policy verification | cosign + Kyverno / Sigstore policy-controller |
| Secrets via External Secrets Operator + Vault / KMS | No long-lived secrets in `etcd` |
| Audit logging | API server audit policy + cluster-wide log shipping |

**Default-deny NetworkPolicy template:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny, namespace: app }
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-web-to-api, namespace: app }
spec:
  podSelector: { matchLabels: { app: api } }
  ingress:
    - from:
        - podSelector: { matchLabels: { app: web } }
      ports: [{ port: 8080 }]
  policyTypes: [Ingress]
```

**Credential lifecycle — short and signed beats long-lived:**

| Pattern | Replaces |
|---|---|
| **STS / AssumeRole** (15 min – 12 h) | Long-lived access keys |
| **Workload Identity Federation** | Static cloud creds in CI |
| **OIDC tokens** for service-to-service | Static API keys |
| **mTLS certs auto-rotated by mesh** | Long-lived certs |
| **JIT (just-in-time) admin access** | Always-on admin |
| **Short-lived bastion sessions** | Persistent SSH keys |
| **Vault / Secrets Manager** dynamic secrets | DB users with permanent passwords |

**Encryption everywhere:**

| Layer | Mechanism |
|---|---|
| In transit (user ↔ edge) | TLS 1.2+ |
| In transit (service ↔ service) | mTLS |
| In transit (app ↔ DB) | TLS to DB |
| At rest (disks) | KMS-managed (LUKS, EBS encryption, GCP CMEK) |
| At rest (object storage) | SSE-KMS / CMEK |
| At rest (DB) | Transparent data encryption |
| Field-level (PII) | App-side envelope encryption |

**Logging & detection — assume breach is real:**

| Signal | Source |
|---|---|
| Identity events | IdP audit logs (Okta, Entra) |
| Cloud control-plane | CloudTrail, Cloud Audit Logs, Azure Activity |
| Cluster control-plane | K8s audit policy |
| Network flows | VPC flow logs, eBPF (Cilium / Hubble), service mesh traces |
| Endpoint | EDR (CrowdStrike, SentinelOne) |
| App behavior | Distributed tracing, structured app logs |
| Centralization | SIEM (Splunk, Sentinel, Chronicle) — single pane |
| Detection | Behavioral analytics, anomaly rules, threat-intel feeds |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Calling VPN-on-laptop "zero trust" | It's not — it's just a perimeter you wear |
| Allow-by-default NetworkPolicy ("temporary") | Becomes permanent; defense vanishes |
| mTLS in `PERMISSIVE` mode forever | Transitional only — flip to `STRICT` namespace by namespace |
| Long-lived service account keys checked into env vars | Leaked once = compromised forever |
| One IdP role for "engineers" | Too coarse — segment by team / sensitivity |
| MFA bypass paths (legacy SMS, app passwords) | Attackers find them first |
| `Allow 0.0.0.0/0` security group "for the load balancer" | Wide-open ingress; use the LB's prefix list |
| Encrypting at rest but not in transit | Plaintext on the wire |
| No audit logs for control plane | Can't see lateral movement |
| Trust based on user-agent / IP allow-lists alone | Spoofable |

**Maturity ladder — where most orgs sit and where to go:**

| Level | Description |
|---|---|
| **0. Perimeter only** | VPN + firewall; flat internal network |
| **1. Identity federation** | SSO + MFA for users; cloud IAM roles for cloud APIs |
| **2. Microsegmentation** | NetworkPolicies / SGs; least-privilege per service |
| **3. Service identity** | mTLS + SPIFFE; service mesh in production |
| **4. Per-call authorization** | L7 policies referencing identity + claims |
| **5. Continuous trust** | Risk-scored sessions; revoke on signal change; session re-auth |

**ZTNA / SASE landscape (commercial):**

| Vendor | Strength |
|---|---|
| Cloudflare Zero Trust / Access | App-level proxy + WARP client + DNS filtering |
| Zscaler ZIA / ZPA | Largest enterprise installs |
| Palo Alto Prisma Access | NGFW heritage |
| Netskope | DLP-strong |
| Tailscale | Developer-friendly mesh + ACLs |
| Twingate | Lightweight per-resource ZTNA |
| AWS Verified Access | Native AWS, OIDC/IdP-driven app gating |

**Quick checklist:**

| Check | Pass? |
|---|---|
| MFA on every IdP login (no exceptions) | ✅ |
| Cloud IAM uses **roles**, not users + access keys | ✅ |
| Default-deny NetworkPolicy in every K8s namespace | ✅ |
| mTLS `STRICT` between services in prod | ✅ |
| No long-lived shared credentials | ✅ |
| All control-plane audit logs centralized | ✅ |
| User access is **per-app**, not "on the corporate network" | ✅ |
| Device posture checked before access | ✅ |
| Privileged access is JIT and time-bounded | ✅ |
| Public services through identity-aware proxy / WAF | ✅ |

**Rule of thumb:** **default deny — explicit allow.** **Identity is the perimeter** (user + device + workload), not the network. **mTLS for east-west, identity-aware proxies for north-south, microsegmentation underneath.** **Short-lived credentials always**; long-lived secrets are a compromise waiting to happen. **VPNs are perimeter** — useful as a step, not the destination. **Assume breach** — design so that one stolen credential or one compromised workload **doesn't unlock the whole org**.
