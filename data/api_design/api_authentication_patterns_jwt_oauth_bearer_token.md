### API Authentication Patterns

**Common approaches:**

| Method | How | Best for |
|--------|-----|----------|
| API Key | Key in header or query param | Server-to-server, simple |
| JWT (Bearer Token) | Signed token with claims | Web/mobile apps, stateless auth |
| OAuth 2.0 | Token-based authorization framework | Third-party access, SSO |
| Session cookie | Server-side session ID in cookie | Traditional web apps |
| mTLS | Client certificate | Service-to-service, high security |

**API Key:**
```
GET /api/users
Authorization: ApiKey sk_live_abc123
# or
X-API-Key: sk_live_abc123
```
- Simple, no expiry management
- Risk: if leaked, full access until revoked
- Best for: internal services, server-to-server

**JWT (JSON Web Token):**
```
Header: {"alg": "RS256", "typ": "JWT"}
Payload: {"sub": "user:123", "role": "admin", "exp": 1704067200}
Signature: HMAC/RSA(header + payload, secret)
```
```
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOi...
```
- Stateless: server doesn't need to store session
- Self-contained: payload carries user info (claims)
- Short-lived (15-60 min), paired with refresh token
- Can't be revoked individually (unless using a blacklist)

**JWT + Refresh token flow:**
```
1. Login: POST /auth/login {email, password}
   -> {access_token (15min), refresh_token (7d)}
2. API calls: Authorization: Bearer <access_token>
3. Token expired: POST /auth/refresh {refresh_token}
   -> {new_access_token, new_refresh_token}
4. Logout: revoke refresh_token server-side
```

**OAuth 2.0 (Authorization Code Flow):**
```
1. App redirects user to auth server:
   GET /authorize?client_id=X&redirect_uri=Y&scope=read&response_type=code

2. User authenticates, consents

3. Auth server redirects back with code:
   GET /callback?code=AUTH_CODE

4. App exchanges code for token (server-side):
   POST /token {code, client_id, client_secret, redirect_uri}
   -> {access_token, refresh_token}

5. App calls API with access_token
```

**OAuth 2.0 flows:**
| Flow | Use case |
|------|----------|
| Authorization Code | Web apps (server-side) |
| Authorization Code + PKCE | Mobile/SPA (no client secret) |
| Client Credentials | Machine-to-machine |
| Device Code | IoT, TV (no browser) |

**Security best practices:**
- HTTPS always (tokens in plaintext over HTTP = compromised)
- Short-lived access tokens (15-60 min)
- Rotate refresh tokens on each use
- Store refresh tokens securely (HTTP-only cookie or secure storage)
- Never store tokens in localStorage (XSS vulnerable)
- Use PKCE for public clients (mobile, SPA)
- Validate JWT signature AND expiry on every request

**Rule of thumb:** JWT for stateless API auth (web/mobile). OAuth 2.0 when third parties need access. API keys for simple server-to-server. Always use short-lived tokens + refresh tokens. HTTPS is non-negotiable.
