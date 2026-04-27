### TLS & Certificate Management

**Validation tiers (what the CA verified):**

| Type | What's checked | Browser indicator | Use case |
|---|---|---|---|
| **DV** (Domain Validation) | You control the domain | Padlock | Default — most public sites; Let's Encrypt is DV |
| **OV** (Organization Validation) | Domain + legal organization exists | Padlock + org in cert details | Some compliance / B2B contracts |
| **EV** (Extended Validation) | Strict legal vetting | Padlock (no more green bar in modern browsers) | Banks, large brands; declining usage |

**Coverage / scope:**

| Type | Covers | Not covers |
|---|---|---|
| Single-name | One exact name (`api.example.com`) | Anything else |
| **SAN** (Subject Alternative Name) | A set of explicit names | Names you forgot to include |
| **Wildcard** `*.example.com` | One subdomain level | `a.b.example.com` (two levels) |
| Multi-domain wildcard `*.a.com, *.b.com` | Wildcards across multiple roots | Same per-root limitation |

> Wildcard + SAN is the common shape: `["*.example.com", "example.com"]` covers root + first-level subs.

**Certificate chain — what the server must serve:**

```
Trust anchor:    Root CA  (in OS/browser trust store — never sent on the wire)
                    │
Intermediate:    Intermediate CA  ← server MUST send these
                    │
Leaf:            Your server cert  ← server sends this
```

| Mistake | Symptom |
|---|---|
| Sending only the leaf | Old / non-cached clients see "untrusted" — every modern client validates the chain |
| Sending the root | Wasted bytes; clients ignore it |
| Wrong intermediate (cross-signed swap) | Some clients work, some don't — fingerprint mismatch |

**Issuance via ACME (Let's Encrypt is the default DV CA):**

| Property | Value |
|---|---|
| Cost | Free |
| Validity | 90 days (forces automation) |
| Rate limit | 50 certs/week per registered domain (with overrides) |
| Renewal | Renew at ~30 days remaining |
| Wildcard | DNS-01 only (HTTP-01 can't prove wildcard control) |

**ACME challenges — pick by environment:**

| Challenge | How proof happens | Limits |
|---|---|---|
| **HTTP-01** | CA fetches `http://yourdomain/.well-known/acme-challenge/<token>` | Public host on port 80; no wildcards |
| **DNS-01** | CA queries TXT record `_acme-challenge.yourdomain` | Required for wildcard; needs DNS automation |
| **TLS-ALPN-01** | TLS handshake on port 443 with special ALPN | Niche — works without HTTP listener |

**cert-manager on Kubernetes — the moving parts:**

| Resource | Role |
|---|---|
| `ClusterIssuer` / `Issuer` | How to talk to the CA (ACME endpoint, account key, solver type) |
| `Certificate` | What you want — DNS names + secret to write |
| `CertificateRequest` | Internal — one issuance attempt |
| `Order` / `Challenge` | Internal ACME state (HTTP / DNS) |
| Secret (output) | The TLS cert + key, mounted by your Ingress / app |

> The common shape: one `ClusterIssuer` for staging + one for prod, then `Certificate` resources (or `cert-manager.io/cluster-issuer` annotation on `Ingress`) per app.

**Cloud provider certificate options:**

| Service | What it gives you | Catch |
|---|---|---|
| **AWS ACM** | Free public certs for ALB / CloudFront / API Gateway / NLB | Can't export private key — only usable on AWS services |
| **AWS ACM Private CA** | Internal PKI for service mesh / mTLS | Per-cert + monthly fee |
| **GCP Certificate Manager** | Managed certs for HTTPS load balancers | GCP-only deployment |
| **Azure Key Vault Certificates** | Renewal + storage; usable from App Service / Front Door | Azure-bound |
| Cloudflare Universal SSL | Edge cert at the CDN | TLS terminated at Cloudflare |

**TLS termination patterns:**

| Pattern | Description | Use when |
|---|---|---|
| **At the load balancer / edge** (most common) | LB terminates TLS, forwards plaintext (or re-encrypted) inside | Simple stack; cheap; centralizes cert mgmt |
| **At the application** | App owns TLS (e.g. nginx in pod) | mTLS, compliance demanding end-to-end |
| **Pass-through** (TLS at the app, LB blind) | LB acts at L4 only | Compliance, strict end-to-end |
| **Re-encrypt** (LB decrypts, then re-TLS to backend) | Inspect L7 + still encrypt internally | PCI / regulated, want WAF in middle |

**mTLS (Mutual TLS) — both sides authenticate:**

| Component | What it does |
|---|---|
| Server presents cert | Standard TLS |
| Server requests client cert | `verify_client on;` (nginx) / `tls.RequestClientCert` |
| Client presents cert | App or sidecar holds it |
| Server validates against trust bundle | Internal CA — not public |
| Used in | Service-to-service (zero-trust); dev-tool auth (e.g. databases); IoT |

> **Service mesh (Istio / Linkerd) gives you mTLS for free** by terminating in a sidecar with auto-rotated identities. See [microservices/service_mesh_istio_sidecar_mtls.md](../../microservices/service_mesh_istio_sidecar_mtls.md).

**TLS versions and cipher posture (2024 baseline):**

| Setting | Recommended |
|---|---|
| Minimum protocol | **TLS 1.2** (TLS 1.3 preferred) |
| Disable | TLS 1.0 / 1.1, SSLv2, SSLv3 |
| Cipher suites (TLS 1.2) | AEAD only — `ECDHE-…GCM…` / `ECDHE-…CHACHA20…` |
| TLS 1.3 cipher suites | Built-in safe set; nothing to tune |
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| OCSP stapling | Enable — server attaches CA's freshness signature |
| Curves | X25519, secp384r1, secp256r1 |

**Debugging TLS — one-liners:**

| Goal | Command |
|---|---|
| Inspect handshake + cert chain | `openssl s_client -connect host:443 -servername host -showcerts` |
| Decode a `.pem` cert | `openssl x509 -in cert.pem -text -noout` |
| Check expiry only | `echo \| openssl s_client -connect host:443 2>/dev/null \| openssl x509 -noout -dates` |
| Check chain trust on a host | `openssl s_client -connect host:443 -CAfile /etc/ssl/certs/ca-certificates.crt` |
| Verify SNI is correct | `openssl s_client -connect ip:443 -servername host` |
| Test from another CA's view | `curl --resolve host:443:<ip> https://host/` |
| Check supported protocols/ciphers | `nmap --script ssl-enum-ciphers -p 443 host` |
| Online scan | `ssllabs.com/ssltest` (paste hostname) |

**Common pitfalls:**

| Pitfall | Symptom | Fix |
|---|---|---|
| Forgetting to include intermediate(s) | Untrusted on Android / older clients | Send full chain (`fullchain.pem`, not just `cert.pem`) |
| No automation, manual renewal | Outage when forgotten | cert-manager / ACM / Caddy / certbot timer |
| Wildcard cert needed, only HTTP-01 set up | Issuance fails | DNS-01 with provider plugin |
| Same cert across many private hosts | One mis-config leaks everywhere | Per-service certs from a private CA |
| `*.example.com` cert used for `a.b.example.com` | "Hostname mismatch" | Two-level wildcard or SAN entry |
| Mixed TLS versions accepted (TLS 1.0 still on) | Deprecation warnings, audit findings | Disable < TLS 1.2 |
| Cert renewed but not reloaded | Server still serves old cert | Reload: nginx `-s reload`, ALB rotates automatically |

**Monitoring you actually need:**

| Metric | Alert when |
|---|---|
| Days-to-expiry per cert | < 14 days (renewal failed) |
| ACME issuance failure rate | > 0 over 24 h |
| TLS handshake error rate | > baseline |
| OCSP staple freshness | Stale > 24 h |

**Rule of thumb:** **automate renewal — never touch a cert manually.** **cert-manager on K8s, ACM on AWS, certbot/Caddy elsewhere.** **Let's Encrypt covers DV and is free**; reach for paid CAs only for OV/EV. **Terminate TLS at the load balancer** for simplicity; **end-to-end (mTLS or pass-through) only when compliance demands it**. **TLS 1.2 minimum, TLS 1.3 preferred**, AEAD cipher suites only. Monitor expiry — the most common TLS outage is a cert nobody renewed.
