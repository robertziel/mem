### QUIC & HTTP/3 — UDP-based, Multiplexed, 0-RTT

**Definition:** **QUIC** is a modern transport protocol built on **UDP** (RFC 9000), with **TLS 1.3 always built-in**. **HTTP/3** runs over QUIC. Wins over TCP+TLS+HTTP/2: **no head-of-line blocking** at the transport layer, **1-RTT handshake** (or 0-RTT for resumption), and **connection migration** (WiFi → cellular survives).

**Why QUIC exists — TCP's pain points:**

| TCP+HTTP/2 problem | QUIC solution |
|---|---|
| **TCP head-of-line blocking** — one lost packet blocks **ALL** streams | Independent UDP streams; lost packet only affects its stream |
| **TCP + TLS handshake = 2-3 RTT** | **1 RTT** built-in TLS, **0 RTT** for reconnects |
| **TCP connection tied to IP** — breaks on network change | **Connection ID** — survives WiFi → cellular |
| **TCP ossification** — middleboxes inspect TCP, hard to evolve | **UDP-based** — middleboxes pass through |
| **Optional encryption** | **Always encrypted** (TLS 1.3 mandatory) |
| **OS kernel-bound implementation** | User-space implementation — fast iteration |

**HTTP version comparison:**

| Feature | **HTTP/1.1** | **HTTP/2** | **HTTP/3** |
|---|---|---|---|
| Transport | TCP | TCP | **QUIC (UDP)** |
| Multiplexing | ❌ (1 req / conn) | ✅ (streams over TCP) | ✅ (independent UDP streams) |
| Head-of-line blocking | Per connection | Per **TCP connection** | **Per stream only** |
| Encryption | Optional | Optional (usually HTTPS) | **Always** (TLS 1.3 built-in) |
| Handshake | TCP+TLS = 2-3 RTT | TCP+TLS = 2-3 RTT | **1 RTT** (0-RTT reconnect) |
| Connection migration | ❌ | ❌ | ✅ |
| Server push | ❌ | ✅ | Removed (didn't pan out) |
| Header compression | None | HPACK | QPACK |
| Adoption | Universal | ~70% | ~30% (growing) |

**HTTP/2 vs HTTP/3 head-of-line blocking — the killer difference:**

```
HTTP/2 over TCP:
   Stream A, B, C share one TCP connection
   Packet for stream B is lost
   → TCP retransmits and reorders
   → A and C also blocked until B's packet arrives
   = "Head-of-line blocking at the transport layer"

HTTP/3 over QUIC:
   Streams A, B, C are independent
   Packet for stream B is lost
   → Only stream B is blocked
   → A and C continue uninterrupted
```

**Handshake timing — 1-RTT and 0-RTT:**

```
First connection (1-RTT):
   Client                    Server
     │   ClientHello + key share + early data │
     │ ─────────────────────────────────────►│
     │   ServerHello + cert + key share + ack │
     │ ◄─────────────────────────────────────│
     │   Application data (encrypted)         │
     │ ─────────────────────────────────────►│

Reconnection (0-RTT):
   Client                    Server
     │   ClientHello + early data + previous keys │
     │ ─────────────────────────────────────►│
     │   ServerHello (resumes session)        │
     │ ◄─────────────────────────────────────│
     ↑ data sent on first packet — saves RTT
```

| RTT | Detail |
|---|---|
| **1-RTT** | First connection; faster than TCP+TLS (which is 2-3) |
| **0-RTT** | Reconnect with cached keys; data sent immediately |
| Replay risk for 0-RTT | Don't use for non-idempotent ops |

**Connection migration — the mobile win:**

```
   Phone on WiFi: 192.168.1.50
   Connection ID: abc123, server tracks this
       
   Phone switches to cellular: 100.64.5.20
   Connection ID still: abc123, server still tracks
   → Connection survives, data flows uninterrupted
   
   With TCP: connection broken, full reconnect needed
```

| Property | Detail |
|---|---|
| Connection ID is independent of IP+port | Survives 5-tuple changes |
| WiFi ↔ cellular ↔ Ethernet | Smooth handoff |
| VPN switch | Continues |
| Critical for mobile UX | TCP would require full reconnect |

**0-RTT replay attack risk:**

| Concern | Detail |
|---|---|
| Attacker captures 0-RTT data | Can replay it later |
| Server processes it twice | If not idempotent → bad |
| Defense | Don't accept 0-RTT for non-idempotent (POST that mutates) |
| Idempotent reads (GET) | Safe |
| Anti-replay caching | Many implementations |

**QUIC packet structure:**

```
   ┌─────────────────────────────────────┐
   │ UDP header (8 bytes)                │
   ├─────────────────────────────────────┤
   │ QUIC public header                   │
   │   - connection ID                    │
   │   - version                          │
   ├─────────────────────────────────────┤
   │ QUIC encrypted payload               │
   │   - frame: STREAM, ACK, CONNECTION_CLOSE, etc.  │
   │   - all encrypted (TLS 1.3)          │
   └─────────────────────────────────────┘
```

**Adoption (2026 estimates):**

| Provider | HTTP/3 status |
|---|---|
| Google (YouTube, Search) | QUIC since 2013 |
| **Cloudflare** | HTTP/3 enabled by default |
| **Fastly** | HTTP/3 enabled |
| Facebook / Meta | QUIC for mobile apps |
| Akamai | Available |
| AWS CloudFront | Enabled by default |
| Browser support | Chrome, Firefox, Safari, Edge, Brave all support |
| ~30%+ of web traffic | Growing |

**Enabling HTTP/3:**

**NGINX (1.25+):**

```nginx
server {
    listen 443 quic reuseport;
    listen 443 ssl;
    http2 on;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols       TLSv1.3;

    add_header Alt-Svc 'h3=":443"; ma=86400';
}
```

**Caddy:** auto-enabled.

**Apache (mod_http2):** experimental.

**Cloud:** CloudFront, Cloudflare, Fastly — enabled by default.

**`Alt-Svc` header — discovery:**

```
Alt-Svc: h3=":443"; ma=86400
```

| Property | Detail |
|---|---|
| Tells browser HTTP/3 is available on the same host | Optional advertisement |
| First request | Over HTTP/2 |
| Subsequent requests | Try HTTP/3 |
| `ma` | Max age in seconds (cache) |

**When HTTP/3 helps most:**

| Scenario | Benefit |
|---|---|
| **Mobile users** | Connection migration + 0-RTT |
| **High-latency networks** | 1-RTT handshake savings stack up |
| **Lossy networks** | No head-of-line blocking |
| **CDN-fronted apps** | Edge HTTP/3, server can stay HTTP/2 |
| **Many parallel resources** | Multiplexing without TCP HOL |

**When HTTP/3 helps less:**

| Scenario | Reason |
|---|---|
| Server-to-server inside a DC | Low latency, low loss; HTTP/2 is fine |
| Single resource per request | Multiplexing not needed |
| Client doesn't support HTTP/3 | Falls back to HTTP/2 |
| UDP blocked by middlebox | Can't reach |

**Server-to-server traffic:**

| Property | Detail |
|---|---|
| Most server-to-server stays on HTTP/2 | Stable, fast on data center networks |
| HTTP/3 / QUIC is gaining ground | gRPC over HTTP/3 emerging |
| Worth experimenting | Large scale benefits |

**Diagnostics:**

| Tool | Use |
|---|---|
| `curl --http3` | Force HTTP/3 |
| Browser DevTools | Network tab shows protocol (h3) |
| Cloudflare Radar | Public adoption stats |
| `wg-quick` / Wireshark | Captures QUIC packets |
| Server access logs | Log protocol used |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| 0-RTT for non-idempotent | Replay attack |
| UDP blocked at firewall | HTTP/3 can't connect; falls back |
| Misconfigured `Alt-Svc` | Browser won't try HTTP/3 |
| TLS < 1.3 | HTTP/3 requires 1.3 |
| Old NGINX (< 1.25) | No HTTP/3 support |
| Forgetting QUIC needs UDP open in SG | Connection times out |
| Mixed pure-HTTP/2 with HTTP/3 expectations | Inconsistent perf |
| Server-side state assumed to be IP-based | Connection migration breaks it |

**Decision matrix:**

| Situation | Recommendation |
|---|---|
| Public web app | Enable HTTP/3 via CDN |
| Mobile-heavy users | HTTP/3 critical |
| Server-to-server intranet | HTTP/2 sufficient |
| API for mobile clients | Worth enabling HTTP/3 |
| WebSocket-heavy app | WebSocket over HTTP/2 still common |

**Cross-references:**

- TCP / IP / UDP basics: [tcp_ip_udp_*.md](../../devops/networking/tcp_ip_udp.md)
- TLS / HTTPS: [tls_*.md](../../web_security/tls_https_cipher_suites_certificate_validation.md)
- HTTP methods + idempotency: [http_methods_*.md](../../frontend/web_fundamentals/http_methods_idempotency_get_post_put_delete_idempotent.md)
- DNS resolution: [dns_*.md](dns_resolution_a_aaaa_cname_mx_records.md)

**Rule of thumb:** **HTTP/3 over QUIC is faster on unreliable / mobile networks** — 0-RTT reconnect, no transport-layer head-of-line blocking, connection migration across networks. Enable it via your **CDN (CloudFront, Cloudflare, Fastly)** for zero application-code changes. The biggest wins are for **mobile users** and **high-latency / lossy networks**. Don't accept **0-RTT** data for **non-idempotent** operations — replay attack risk.
