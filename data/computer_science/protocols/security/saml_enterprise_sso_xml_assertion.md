### SAML 2.0 — Enterprise SSO (XML-based)

**Definition:** **SAML 2.0** is the legacy XML-based protocol for **enterprise single sign-on (SSO)**. Browsers redirect between **Service Provider (SP)** and **Identity Provider (IdP)**, exchanging signed XML assertions. Common with Okta, Azure AD, ADFS, OneLogin. **OIDC** is the modern alternative (JSON / JWT, mobile-friendly), but enterprises often **require SAML** — support both if selling B2B.

**Side-by-side: SAML vs OIDC:**

| Property | **SAML 2.0** | **OIDC** |
|---|---|---|
| Format | XML | JSON (JWT) |
| Era | 2005 | 2014 |
| Mobile / API friendly | ❌ | ✅ |
| Browser SSO | ✅ Strong | ✅ |
| Native apps | ❌ Awkward | ✅ |
| Extensibility | Heavy (XML schema) | Light (JWT claims) |
| Common providers | Okta, Azure AD, ADFS | Auth0, Okta, Google, Microsoft Entra |
| Best for | Enterprise SSO | Modern apps + APIs |
| Token | XML assertion | JWT (`id_token`, `access_token`) |
| Discovery | Metadata XML | `.well-known/openid-configuration` |
| Built on | XML, XML-DSIG, XML-Enc | OAuth 2.0 + JWT |

**Core SAML actors:**

| Actor | Role |
|---|---|
| **User** | Authenticates |
| **SP (Service Provider)** | Your application |
| **IdP (Identity Provider)** | Okta / Azure AD / ADFS / OneLogin |
| **Browser** | Carries SAML messages between SP and IdP |

**SAML SP-initiated flow:**

```
   User                  SP (Your App)            IdP
     │                        │                    │
     │  GET /protected        │                    │
     │ ──────────────────────►│                    │
     │  302 Redirect to IdP   │                    │
     │  (with AuthnRequest)   │                    │
     │ ◄──────────────────────│                    │
     │                        │                    │
     │  GET /idp?SAMLRequest=...                   │
     │ ───────────────────────┼───────────────────►│
     │                        │  (User authenticates) │
     │                        │                    │
     │  POST /sp/acs (with SAMLResponse)           │
     │ ◄──────────────────────┼────────────────────│
     │                        │                    │
     │  Submit SAMLResponse to SP                  │
     │ ──────────────────────►│                    │
     │                        │ Validate signature, │
     │                        │ assertion, conditions│
     │  302 to /protected     │                    │
     │ ◄──────────────────────│                    │
```

| Step | Detail |
|---|---|
| 1. User visits SP | Unauthenticated |
| 2. SP creates `AuthnRequest` | Asks IdP "is this user signed in?" |
| 3. Browser redirected to IdP | With AuthnRequest |
| 4. User authenticates at IdP | Or session already valid |
| 5. IdP returns SAMLResponse | Signed XML assertion |
| 6. Browser POSTs to SP's ACS | `/saml/acs` (Assertion Consumer Service) |
| 7. SP validates signature + assertion | If valid → log user in |

**SAML IdP-initiated flow:**

```
   User logs into IdP first (e.g., Okta dashboard)
   Clicks "Open MyApp"
   IdP creates SAMLResponse and POSTs to SP's ACS
   SP validates and logs user in
   No prior SP request — IdP-initiated
```

| Risk | Detail |
|---|---|
| **Replay attack** | Same response could be replayed if `InResponseTo` not enforced |
| Generally less secure than SP-initiated | Use only if needed |

**SAML Response (the XML assertion):**

```xml
<saml:Assertion ID="abc123" Version="2.0" IssueInstant="2026-04-27T10:00:00Z">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <ds:Signature>...</ds:Signature>          <!-- XML-DSIG -->

  <saml:Subject>
    <saml:NameID Format="emailAddress">alice@example.com</saml:NameID>
  </saml:Subject>

  <saml:Conditions NotBefore="..." NotOnOrAfter="...">
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.com</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>

  <saml:AttributeStatement>
    <saml:Attribute Name="email">
      <saml:AttributeValue>alice@example.com</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="role">
      <saml:AttributeValue>admin</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

**SAML attributes (claims) — what gets passed:**

| Common attribute | Example value |
|---|---|
| `nameID` | User identifier (email, UUID) |
| `email` | `alice@example.com` |
| `firstName`, `lastName` | Display |
| `role` / `groups` | Authorization |
| `department` | Org info |
| Custom attributes | Anything IdP wants to share |

**SAML signing & encryption:**

| Layer | Detail |
|---|---|
| **XML-DSIG** | Signed XML — assertion or whole response |
| **XML-Encryption** | Optional encryption of sensitive fields |
| **Signing key**: IdP's private key | SP validates with IdP's public cert |
| **Encryption key**: SP's public key | If used |
| Often only assertion is signed | Or response, or both |
| Validation is strict | Signature mismatch = reject |

**SAML metadata — the configuration handshake:**

| Property | Detail |
|---|---|
| **IdP metadata** | URL to AuthnRequest endpoint, certs, attributes |
| **SP metadata** | ACS URL, entity ID, certs |
| Exchanged once | Bootstrap configuration |
| Updated when certs rotate | Manual or automated |
| XML format | Bulky but standardized |

**SAML validation — what SP MUST check:**

| Check | Why |
|---|---|
| Valid XML signature | Authenticity |
| Trusted IdP issuer | Right source |
| `NotBefore` / `NotOnOrAfter` | Not expired |
| `AudienceRestriction` matches your entity | Not for someone else |
| `InResponseTo` matches a sent AuthnRequest | Replay prevention (SP-initiated) |
| `Destination` matches your ACS URL | Right target |
| Single use (track and reject duplicate IDs) | Replay |
| Subject confirmation method | `bearer` typical |

**Common attacks & defenses:**

| Attack | Defense |
|---|---|
| **XML Signature Wrapping (XSW)** | Use battle-tested library; validate strictly |
| **Replay** | `InResponseTo` + assertion ID tracking + `NotOnOrAfter` |
| **Audience confusion** | Always check `AudienceRestriction` |
| **Open Redirector** | Validate `RelayState` URLs |
| **Certificate impersonation** | Pin / verify IdP cert |
| **SAML in URLs (GET)** | Prefer POST binding; URLs cached/logged |

**Common SAML libraries:**

| Language | Library |
|---|---|
| Ruby | `ruby-saml`, `omniauth-saml` |
| Python | `python3-saml`, `pysaml2` |
| Node | `passport-saml`, `samlify` |
| Java | OpenSAML, Spring Security SAML |
| Go | `crewjam/saml`, `russellhaering/gosaml2` |
| .NET | `Sustainsys.Saml2`, `ITfoxtec` |

> **Don't roll your own SAML.** Use libraries — XML signing is famously easy to get wrong.

**SAML pain points (why OIDC is preferred for new):**

| Pain | Detail |
|---|---|
| XML is verbose + slow | KB per assertion |
| XML signing complexity | XSW vulnerability historic |
| No native mobile / SPA support | Browser-redirect only |
| Bulky IdP / SP metadata exchange | Cert rotation manual |
| Limited token-based delegation | Awkward for APIs |
| Stateful at SP (often) | Session cookies after assertion |

**When you must support SAML:**

| Scenario | Detail |
|---|---|
| Selling B2B SaaS | Many enterprises require it |
| Enterprise IT mandate | "We use ADFS / Azure AD SAML" |
| Compliance requirements | SAML audit trail expected |
| Existing IdP | Customer doesn't migrate |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Just-in-time provisioning** | Create user account on first SSO |
| **SCIM** for user lifecycle | Separate protocol for create / update / deprovision |
| **Group / role mapping** | SAML groups → app roles |
| **MFA at IdP** | Enforced before SAML response issued |
| **Single Logout (SLO)** | Logs user out of all SPs (rarely supported well) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Skipping `InResponseTo` validation | Replay attack |
| Trusting unsigned assertions | Forged login |
| Not validating `AudienceRestriction` | Cross-app token replay |
| Storing SAML session forever | Stale auth |
| Mixing SAML + JWT identity | Confusing dual model |
| Not rotating IdP certs | Cert expires → broken SSO |
| `RelayState` open redirect | Phishing redirect |
| Hand-rolling XML parsing | XSW vulnerabilities |
| Forgetting clock skew tolerance | Valid assertions rejected |

**Cross-references:**

- OIDC / OAuth: [oidc_*.md](oidc_oauth_authentication_authorization_flows.md)
- Authentication attacks: [authentication_attacks_*.md](../../web_security/authentication_attacks_brute_force_session.md)
- TLS / HTTPS (transport for SAML): [tls_*.md](../../web_security/tls_https_cipher_suites_certificate_validation.md)

**Rule of thumb:** **SAML for enterprise customers who require it, OIDC for new apps and mobile.** Many enterprises still mandate SAML — **support both** if selling B2B. **Never roll your own SAML library** — XML signing is famously easy to get wrong (XSW). Always validate **`InResponseTo`**, **`AudienceRestriction`**, **`NotOnOrAfter`**, and **track assertion IDs** to prevent replay.
