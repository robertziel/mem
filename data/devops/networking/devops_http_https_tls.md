### HTTP, HTTPS, TLS/SSL

**HTTP methods:**
- `GET` - read, idempotent, cacheable
- `POST` - create, not idempotent
- `PUT` - full replace, idempotent
- `PATCH` - partial update
- `DELETE` - remove, idempotent
- `HEAD` - GET without body (check if resource exists)
- `OPTIONS` - discover allowed methods (CORS preflight)

**Status codes:**
- `2xx` - Success (200 OK, 201 Created, 204 No Content)
- `3xx` - Redirect (301 Permanent, 302 Found, 304 Not Modified)
- `4xx` - Client error (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests)
- `5xx` - Server error (500 Internal, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)

**HTTP/1.1 vs HTTP/2 vs HTTP/3:**
- HTTP/1.1: text-based, keep-alive connections with serial request-response (head-of-line blocking)
- HTTP/2: binary, multiplexed streams over single connection, header compression, server push
- HTTP/3: QUIC (UDP-based), faster handshake, better on lossy networks

**TLS handshake (simplified):**
1. Client Hello (supported cipher suites, TLS version)
2. Server Hello (chosen cipher, server certificate)
3. Client verifies certificate against CA chain
4. Key exchange (asymmetric crypto to agree on symmetric key)
5. Encrypted communication begins with symmetric key

**TLS versions:**
- TLS 1.2 - still widely supported
- TLS 1.3 - faster (1-RTT handshake), fewer cipher suites, more secure
- SSL 3.0, TLS 1.0, 1.1 - deprecated, insecure

**Certificates:**
- **CA** - Certificate Authority (Let's Encrypt, DigiCert)
- **SAN** - Subject Alternative Name (multiple domains on one cert)
- **Wildcard** - `*.example.com` (one level only)
- **mTLS** - mutual TLS, both client and server present certificates

**Rule of thumb:** Always HTTPS in production. Use TLS 1.2+ only. Automate cert renewal (cert-manager, Let's Encrypt). 502/504 usually means your upstream is down or slow.
