### QUIC & HTTP/3

**What QUIC is:**
- Modern transport protocol built on UDP (replaces TCP for HTTP)
- Developed by Google, now IETF standard (RFC 9000)
- Foundation of HTTP/3
- Built-in TLS 1.3 encryption (always encrypted)

**Why QUIC/HTTP/3 exists:**
| Problem with TCP + HTTP/2 | QUIC solution |
|---------------------------|---------------|
| TCP head-of-line blocking (one lost packet blocks ALL streams) | Independent streams (lost packet affects only its stream) |
| TCP + TLS handshake = 2-3 round trips | 1-RTT handshake (TLS built-in), 0-RTT for reconnection |
| TCP connection tied to IP (breaks on network switch) | Connection ID (survives WiFi→cellular switch) |
| TCP ossification (hard to update, middleboxes inspect it) | UDP-based (middleboxes pass through) |

**HTTP/1.1 vs HTTP/2 vs HTTP/3:**
| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| Transport | TCP | TCP | QUIC (UDP) |
| Multiplexing | No (1 request/connection) | Yes (streams over TCP) | Yes (independent UDP streams) |
| Head-of-line blocking | Per connection | Per TCP connection | Per stream only |
| Encryption | Optional (HTTPS) | Optional (usually HTTPS) | Always (TLS 1.3 built-in) |
| Handshake | TCP + TLS = 2-3 RTT | TCP + TLS = 2-3 RTT | 1 RTT (0-RTT reconnect) |
| Connection migration | No | No | Yes (connection ID) |

**0-RTT connection resumption:**
```
First connection:  Client ↔ Server  1-RTT handshake (still fast)
Reconnection:      Client → Server  0-RTT (sends data with first packet!)
                   ← Server responds immediately

Use case: mobile user switches from WiFi to cellular → QUIC maintains connection
TCP would require full new handshake
```

**Adoption:**
- Google (YouTube, Search): QUIC since 2013
- Cloudflare: HTTP/3 enabled by default
- Facebook/Meta: QUIC for mobile apps
- ~30% of web traffic uses HTTP/3 (2024)
- Major browsers: Chrome, Firefox, Safari, Edge all support HTTP/3

**Enabling HTTP/3:**
```nginx
# Nginx (1.25+)
server {
    listen 443 quic reuseport;
    listen 443 ssl;
    http2 on;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    add_header Alt-Svc 'h3=":443"; ma=86400';  # Advertise HTTP/3 support
}
```

**CloudFront/CDN:**
- CloudFront: HTTP/3 enabled by default
- Cloudflare: HTTP/3 enabled by default
- No application code changes needed (negotiated at transport level)

**Rule of thumb:** HTTP/3 is faster on unreliable/mobile networks (0-RTT, no head-of-line blocking). Enable via CDN (CloudFront, Cloudflare) for zero effort. No application code changes needed. Biggest benefit: mobile users and high-latency networks. HTTP/2 is still the baseline for most server-to-server communication.
