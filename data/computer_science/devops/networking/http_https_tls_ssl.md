### HTTP, HTTPS, TLS / SSL

**HTTP methods — semantics + properties:**

| Method | Safe | Idempotent | Cacheable | Use |
|---|---|---|---|---|
| `GET` | ✅ | ✅ | ✅ | Read |
| `HEAD` | ✅ | ✅ | ✅ | Like GET, no body |
| `OPTIONS` | ✅ | ✅ | ❌ | Discover (CORS preflight) |
| `PUT` | ❌ | ✅ | ❌ | Replace (full update) |
| `DELETE` | ❌ | ✅ | ❌ | Remove |
| `POST` | ❌ | ❌ | rarely | Create / non-idempotent |
| `PATCH` | ❌ | ❌* | ❌ | Partial update |
| `CONNECT` | ❌ | ❌ | ❌ | Tunnel (TLS through proxy) |
| `TRACE` | ✅ | ✅ | ❌ | Echo for debugging (mostly disabled) |

> *`PATCH` is **not** required to be idempotent (RFC 5789), but APIs usually make it so via `If-Match` / version checking.

**Status codes — categories + the ones you'll meet daily:**

| Class | Meaning | Examples |
|---|---|---|
| `1xx` | Informational | `100 Continue`, `101 Switching Protocols`, `103 Early Hints` |
| `2xx` | Success | `200 OK`, `201 Created`, `202 Accepted`, `204 No Content`, `206 Partial Content` |
| `3xx` | Redirect | `301 Moved Permanently`, `302 Found`, `304 Not Modified`, `307 Temporary`, `308 Permanent` |
| `4xx` | Client error | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `405 Method Not Allowed`, `409 Conflict`, `412 Precondition Failed`, `415 Unsupported Media Type`, `422 Unprocessable Entity`, `428 Precondition Required`, `429 Too Many Requests` |
| `5xx` | Server error | `500 Internal Server Error`, `501 Not Implemented`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout` |

**`401` vs `403` vs `404`:**

| Code | Means |
|---|---|
| `401 Unauthorized` | "I don't know who you are" — authentication missing/failed |
| `403 Forbidden` | "I know you, you can't do this" — authorization denied |
| `404 Not Found` | Resource doesn't exist (or you're hiding existence to avoid leakage) |

**`502` vs `503` vs `504`:**

| Code | Means |
|---|---|
| `502 Bad Gateway` | Upstream returned an invalid response |
| `503 Service Unavailable` | Server is overloaded / under maintenance |
| `504 Gateway Timeout` | Upstream took too long to respond |

**HTTP versions — what changed:**

| Version | Era | Key features |
|---|---|---|
| HTTP/1.0 (1996) | One request per connection | Stateless, simple |
| HTTP/1.1 (1997) | Default for decades | Persistent connections, pipelining (rarely used), virtual hosts via `Host` header |
| HTTP/2 (2015) | Most modern web | **Binary**, multiplexed streams over one TCP connection, header compression (HPACK), server push (deprecated), prioritization |
| HTTP/3 (2022) | Modern (rolling out) | Built on **QUIC over UDP**; faster handshake; no head-of-line blocking; better on lossy networks |

**HTTP/1.1 head-of-line blocking:**

| Issue | Detail |
|---|---|
| Pipelining sends multiple requests | But responses must come in order |
| One slow response blocks the rest | Real-world deploys mostly disabled pipelining |
| Browsers worked around it with multiple connections per origin | 6 typical |

**HTTP/2 multiplexing — what it solved:**

| HTTP/1.1 | HTTP/2 |
|---|---|
| One request at a time per connection | Multiple streams in parallel |
| Each request line + headers in plaintext | Binary frames |
| No header compression | HPACK header compression |
| Connection-per-resource feel | Single connection, many streams |
| Browsers open 6 connections per origin | One connection multiplexes everything |

> HTTP/2 still suffers from **TCP-level head-of-line blocking** — a lost packet stalls all streams. HTTP/3 (QUIC over UDP) fixes this.

**HTTP/3 highlights:**

| Property | Detail |
|---|---|
| Transport | QUIC (UDP + TLS 1.3 + congestion control + recovery) |
| Handshake | 1-RTT (first time) / 0-RTT (resumed) |
| No TCP-level HoL blocking | Per-stream loss recovery |
| Connection migration | Survives network changes (Wi-Fi → cellular) |
| Header compression | QPACK (similar to HPACK) |
| Adoption | Cloudflare, Google, Meta, Apple — increasingly default |

**HTTPS vs HTTP — what HTTPS adds:**

| Property | HTTPS |
|---|---|
| Encryption | TLS encrypts payload |
| Authentication | Certificate proves server identity |
| Integrity | MAC prevents tampering |
| Default port | 443 (HTTPS) vs 80 (HTTP) |
| Required for | HTTP/2 in browsers; many APIs; mTLS |

**TLS handshake — simplified:**

| Step | TLS 1.3 |
|---|---|
| 1 | Client Hello (random, supported cipher suites, key share, extensions) |
| 2 | Server Hello (chosen cipher, server cert, key share, signature) |
| 3 | Client verifies cert against trust store; computes session keys |
| 4 | Both sides have agreed on a symmetric key (1-RTT total) |
| 5 | Subsequent traffic is encrypted with the symmetric key |

> **TLS 1.3 = 1-RTT** for new connections (vs 2-RTT for TLS 1.2). **0-RTT** for resumed connections — but with replay-attack tradeoffs.

**TLS versions:**

| Version | Status |
|---|---|
| **TLS 1.3** (2018) | **Recommended** — fastest, fewest cipher suites, most secure |
| **TLS 1.2** (2008) | Still widely supported, acceptable |
| TLS 1.1 / 1.0 | Deprecated; security holes; disable |
| SSL 3.0 / 2.0 | Long dead; never enable |

**Certificate basics:**

| Concept | Detail |
|---|---|
| Certificate Authority (CA) | Issuer that browsers / OSes trust |
| Public CA | Let's Encrypt, DigiCert, Sectigo |
| Internal / Private CA | For service-to-service (mTLS) |
| **DV / OV / EV** | Domain / Org / Extended Validation tiers |
| **SAN** (Subject Alternative Name) | Multiple domains on one cert |
| **Wildcard** (`*.example.com`) | One subdomain level |
| **mTLS** | Both client + server present certs |
| Chain | Root → Intermediate → Server cert (server must serve full chain except root) |

**Cert management — modern:**

| Pattern | Detail |
|---|---|
| **Let's Encrypt + ACME** | Free DV certs with 90-day rotation |
| **cert-manager** (K8s) | Automates ACME issuance |
| **AWS ACM** | Managed certs for AWS services (no export) |
| **HashiCorp Vault PKI** | Internal CA |
| Manual cert handling | Avoid; always automate renewal |

**Cookies — the security knobs:**

| Attribute | Effect |
|---|---|
| `Secure` | Only sent over HTTPS |
| `HttpOnly` | Not readable from JavaScript |
| `SameSite=Strict / Lax / None` | Cross-site sending control (Lax default in modern browsers) |
| `Domain` | Scope to subdomain |
| `Path` | URL path prefix |
| `Max-Age` / `Expires` | Lifetime |
| `__Host-` prefix | Forces `Secure` + no `Domain` + `Path=/` |

**Common security headers (set on responses):**

| Header | Purpose |
|---|---|
| `Strict-Transport-Security` (HSTS) | Force HTTPS in browsers |
| `Content-Security-Policy` (CSP) | XSS defense |
| `X-Frame-Options` (or CSP `frame-ancestors`) | Anti-clickjacking |
| `X-Content-Type-Options: nosniff` | MIME-sniffing defense |
| `Referrer-Policy` | Privacy (control `Referer` header) |
| `Permissions-Policy` | Disable unused browser features |
| `Cross-Origin-*-Policy` (COOP / COEP / CORP) | Cross-origin isolation for SharedArrayBuffer etc. |

**HSTS — force HTTPS:**

| Header | Effect |
|---|---|
| `Strict-Transport-Security: max-age=31536000` | Browser remembers HTTPS-only for 1 year |
| `; includeSubDomains` | Apply to all subdomains |
| `; preload` | Eligible for browser preload list (one-way; hard to revert) |

**Cross-Origin Resource Sharing (CORS):**

| Header | Purpose |
|---|---|
| `Origin` (request) | Where the request came from |
| `Access-Control-Allow-Origin` (response) | Permitted origins |
| `Access-Control-Allow-Methods` | Permitted methods |
| `Access-Control-Allow-Headers` | Permitted custom headers |
| `Access-Control-Allow-Credentials` | Allow cookies / Authorization |
| Preflight | `OPTIONS` request before non-simple requests |

**Common request / response headers:**

| Header | Use |
|---|---|
| `Host` | Virtual host identifier |
| `User-Agent` | Client identification |
| `Accept` / `Accept-Encoding` / `Accept-Language` | Content negotiation |
| `Content-Type` | Body format |
| `Content-Length` | Body size |
| `Authorization: Bearer <token>` | Auth |
| `Cookie` | Client → server |
| `Set-Cookie` | Server → client |
| `Cache-Control` | Caching directives |
| `ETag` / `If-None-Match` | Cache validation |
| `If-Match` | Optimistic concurrency |
| `Location` | Redirect target / 201 Created destination |
| `Retry-After` | When to retry (429 / 503) |
| `X-Forwarded-For` / `X-Forwarded-Proto` / `Forwarded` | Behind proxies |
| `X-Request-Id` / `Traceparent` | Request correlation |

**Performance tooling:**

| Tool | Use |
|---|---|
| `curl -v` | Inspect request/response headers |
| `curl --http2` / `--http3` | Force version |
| `httpie` (`http`) | Friendlier curl |
| `openssl s_client -connect host:443 -servername host` | TLS handshake debug |
| `testssl.sh` | TLS configuration audit |
| `ssllabs.com/ssltest` | Public TLS audit |
| Browser DevTools → Network | Per-request timing |
| `tcpdump` / Wireshark | Packet level |
| `keylog` (browser) + Wireshark | Decrypt TLS for debugging |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Mixed content (HTTPS page loading HTTP resources) | Browser blocks; security hole |
| HSTS preload before fully ready for HTTPS | Hard to revert |
| CORS misconfigured (`*` with credentials) | Effective same-origin bypass |
| Cookies without `Secure` / `HttpOnly` | XSS / leakage risk |
| TLS 1.0 / 1.1 still enabled | Audit failure |
| ALPN missing for HTTP/2 | Browsers fall back to HTTP/1.1 |
| Cert chain incomplete (missing intermediate) | "Untrusted" warnings on some clients |
| Long-lived self-signed certs | Maintenance burden |
| Forgetting `Vary` headers when content varies by Accept-Encoding / Authorization | Cache poisoning |

**Quick checklist:**

| Check | Pass? |
|---|---|
| HTTPS everywhere (HSTS) | ✅ |
| TLS 1.2 minimum, TLS 1.3 preferred | ✅ |
| Modern cipher suites only | ✅ |
| Cert auto-renewal automated | ✅ |
| Full cert chain served | ✅ |
| Security headers (HSTS, CSP, X-Frame-Options) | ✅ |
| Cookies: `Secure` + `HttpOnly` + `SameSite` | ✅ |
| HTTP/2 enabled (HTTP/3 if available) | ✅ |
| 502 / 503 / 504 distinguishable in monitoring | ✅ |
| `Retry-After` honored on 429 / 503 | ✅ |

**Cross-references:**

- TLS cert lifecycle: [tls_certificate_management.md](../security/tls_certificate_management.md)
- CSRF / cookies: [csrf_*.md](../../web_security/csrf_cross_site_request_forgery_samesite_token_rails.md)
- XSS / CSP: [xss_*.md](../../web_security/xss_cross_site_scripting_stored_reflected_dom.md)
- API status code mapping: [error_handling_*.md](../../api_design/error_handling_problem_details_rfc7807_structured_errors.md)

**Rule of thumb:** **HTTPS by default, TLS 1.2+ minimum (1.3 preferred), automate cert renewal, set HSTS + CSP + cookie flags.** Know the difference between **502 (bad upstream response)** and **504 (upstream timeout)** — they point at different parts of the stack. **HTTP/2 + HTTP/3** are wins for free if your server supports them; cert-manager / Let's Encrypt makes them easy.
