### SAML 2.0 (Enterprise SSO)

**What SAML does:**
- XML-based protocol for enterprise Single Sign-On
- Primarily for web browser SSO (not APIs/mobile)
- Common in: Okta, Azure AD, ADFS, OneLogin

**SAML flow:**
```
1. User visits app (Service Provider)
2. App redirects to IdP login page
3. User authenticates
4. IdP sends SAML Response (XML assertion) back to app
5. App validates assertion → user authenticated
```

**SAML vs OIDC:**
| Feature | SAML 2.0 | OIDC |
|---------|----------|------|
| Format | XML | JSON (JWT) |
| Mobile | No | Yes |
| API-friendly | No | Yes |
| Era | 2005 | 2014 |
| Best for | Enterprise SSO | Modern apps |

**Rule of thumb:** SAML for enterprise customers who require it. OIDC for new applications. Many enterprises still require SAML — support it if selling B2B.
