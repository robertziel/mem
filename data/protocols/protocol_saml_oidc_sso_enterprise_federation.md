### SAML, OIDC & SSO (Enterprise Authentication)

**SSO (Single Sign-On):**
- Login once, access multiple applications
- User authenticates with Identity Provider (IdP), gets access to Service Providers (SPs)
- Examples: "Log in with Google" across Gmail, YouTube, GCP

**SAML 2.0 (Security Assertion Markup Language):**
- XML-based protocol for enterprise SSO
- Primarily for web browser SSO (not APIs)
- Common in: Okta, Azure AD, ADFS, OneLogin

**SAML flow:**
```
1. User visits app (Service Provider)
2. App redirects to IdP login page (Okta, Azure AD)
3. User authenticates with IdP
4. IdP sends SAML Response (XML assertion) back to app
5. App validates assertion → user is authenticated

  [User] → [Service Provider] → redirect → [Identity Provider]
                                                    ↓ authenticate
  [User] ← [Service Provider] ← SAML assertion ← [Identity Provider]
```

**OIDC (OpenID Connect):**
- Identity layer built ON TOP of OAuth 2.0
- JSON-based (not XML like SAML)
- Returns: ID Token (JWT with user info) + Access Token
- Used for: modern web apps, mobile apps, APIs

**OIDC flow (Authorization Code):**
```
1. App redirects to IdP: /authorize?scope=openid profile email
2. User authenticates with IdP
3. IdP redirects back with authorization code
4. App exchanges code for tokens: POST /token
5. Receives: id_token (JWT) + access_token
6. App validates id_token → user authenticated

ID Token payload:
{
  "sub": "user_123",
  "email": "alice@company.com",
  "name": "Alice Smith",
  "iss": "https://accounts.google.com",
  "exp": 1704067200
}
```

**SAML vs OIDC vs OAuth 2.0:**
| Feature | SAML 2.0 | OIDC | OAuth 2.0 |
|---------|----------|------|-----------|
| Purpose | Authentication (SSO) | Authentication (SSO) | Authorization (API access) |
| Format | XML | JSON (JWT) | JSON |
| Token | SAML Assertion | ID Token + Access Token | Access Token |
| Transport | HTTP POST/Redirect | HTTP | HTTP |
| Mobile-friendly | No | Yes | Yes |
| API-friendly | No | Yes | Yes |
| Era | 2005 (enterprise) | 2014 (modern) | 2012 |
| Best for | Enterprise SSO, legacy | Modern web/mobile SSO | API authorization |

**Common IdPs (Identity Providers):**
| Provider | Protocols | Use case |
|----------|-----------|----------|
| Okta | SAML, OIDC | Enterprise SSO |
| Azure AD (Entra ID) | SAML, OIDC | Microsoft ecosystem |
| Google Workspace | OIDC, SAML | Google ecosystem |
| Auth0 | OIDC | Developer-focused |
| AWS Cognito | OIDC | AWS-native |
| Keycloak | SAML, OIDC | Self-hosted, open source |

**Federation:**
```
Company A (Okta) ←federation→ Company B (Azure AD)
User from Company B can access Company A's apps using their own credentials
Protocols: SAML or OIDC for cross-org trust
```

**When to use what:**
| Scenario | Protocol |
|----------|----------|
| Enterprise SSO (existing SAML infra) | SAML 2.0 |
| New web/mobile app SSO | OIDC |
| API authorization (third-party access) | OAuth 2.0 |
| Internal app with Google/GitHub login | OIDC |
| B2B customer SSO | SAML (enterprises expect it) |

**Rule of thumb:** OIDC for new applications (modern, JSON, mobile-friendly). SAML for enterprise SSO (many enterprises still require it). OAuth 2.0 for API authorization (not authentication). Support both SAML and OIDC if selling to enterprises — some customers will require one or the other.
