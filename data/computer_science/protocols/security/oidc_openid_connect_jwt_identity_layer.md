### OIDC (OpenID Connect)

**What OIDC is:**
- Identity layer built ON TOP of OAuth 2.0
- Returns: ID Token (JWT with user info) + Access Token
- JSON-based, modern, mobile-friendly

**OIDC flow:**
```
1. App redirects to IdP: /authorize?scope=openid profile email
2. User authenticates
3. IdP redirects back with authorization code
4. App exchanges code for tokens: POST /token
5. Receives: id_token (JWT) + access_token
6. App validates id_token → user authenticated

ID Token: { "sub": "user_123", "email": "alice@co.com", "name": "Alice" }
```

**OIDC vs OAuth 2.0:**
- OAuth 2.0 = authorization ("what can you access")
- OIDC = authentication ("who are you") built on OAuth 2.0

**Common providers:** Google, Azure AD, Okta, Auth0, AWS Cognito, Keycloak.

**Rule of thumb:** OIDC for modern web/mobile SSO. OAuth 2.0 for API authorization. OIDC adds identity (user info) on top of OAuth's access control. "Login with Google" uses OIDC.
