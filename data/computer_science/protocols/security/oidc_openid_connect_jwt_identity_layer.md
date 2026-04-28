### OIDC (OpenID Connect) — Identity on Top of OAuth 2.0

**Definition:** **OpenID Connect** is the **identity layer** built on top of **OAuth 2.0**. OAuth 2.0 grants access (authorization); OIDC adds **authentication** — proving *who* the user is — and standardizes user-info exchange.

**OAuth 2.0 vs OIDC at a glance:**

| | OAuth 2.0 | OIDC |
|---|---|---|
| Purpose | **Authorization** ("can this app access X?") | **Authentication** ("who is this user?") |
| Returns | Access token (opaque or JWT) | **ID token** (JWT) + Access token |
| Standardizes user info? | No | **Yes** — `userinfo` endpoint + standard claims |
| Built on top of | (the base spec) | OAuth 2.0 |
| Use for | API access | "Login with Google / Apple / Microsoft" |

> **OIDC = OAuth 2.0 + ID token + standard user claims.** "Login with Google" uses OIDC under the hood.

**Tokens — three things you'll meet:**

| Token | Format | Purpose | Verified by |
|---|---|---|---|
| **ID Token** | **Always JWT** | Proves **who the user is** | Client (verifies signature) |
| **Access Token** | Opaque or JWT | Grants access to resource APIs | Resource server (introspect or verify JWT) |
| **Refresh Token** | Opaque | Get new access tokens without re-auth | IdP only |

**Standard OIDC flow (Authorization Code + PKCE):**

```
1. App redirects user to IdP authorize endpoint:
   GET /authorize
     ?client_id=APP
     &redirect_uri=https://app/callback
     &response_type=code
     &scope=openid profile email
     &state=<csrf>
     &code_challenge=<sha256-of-verifier>
     &code_challenge_method=S256

2. User authenticates with IdP (password, MFA, biometric, federated SSO)

3. IdP redirects back:
   GET /callback?code=<auth-code>&state=<csrf>

4. App exchanges code for tokens:
   POST /token
     grant_type=authorization_code
     code=<auth-code>
     redirect_uri=https://app/callback
     code_verifier=<original-random>
     client_id=APP
   →  { id_token, access_token, refresh_token, expires_in }

5. App validates id_token (signature, iss, aud, exp, nonce)

6. App uses user identity (sub claim) to log them in
   App uses access_token for downstream API calls
```

**OIDC scopes (request what you need):**

| Scope | Returns |
|---|---|
| `openid` | **Required** — turns OAuth into OIDC |
| `profile` | name, family_name, given_name, picture, locale, etc. |
| `email` | email + email_verified |
| `address` | address claims |
| `phone` | phone_number + verified |
| `offline_access` | Allow refresh tokens |
| Custom scopes | Provider-specific (`groups`, `roles`, etc.) |

**Standard ID-token claims:**

| Claim | Meaning |
|---|---|
| `iss` | Issuer (IdP URL) — verify it's the expected one |
| `sub` | Subject — stable user ID at this IdP (NEVER reuse across IdPs) |
| `aud` | Audience — your `client_id` (verify) |
| `exp` | Expiry (epoch seconds) |
| `iat` | Issued-at |
| `auth_time` | When the user actually authenticated |
| `nonce` | Replay-protection (you set, IdP echoes) |
| `acr` / `amr` | Auth context / methods (MFA used?) |
| `azp` | Authorized party |
| `at_hash` | Hash of access token (binds tokens) |
| `email`, `email_verified` | If `email` scope |
| `name`, `picture`, `locale` | If `profile` scope |

**ID token validation (in your code):**

| Step | Detail |
|---|---|
| 1 | Parse JWT header for `kid` (key id) |
| 2 | Fetch IdP's JWKS (`/.well-known/openid-configuration` → `jwks_uri`) |
| 3 | Verify signature with the matching public key (RS256 / ES256 / EdDSA) |
| 4 | Verify `iss` matches expected IdP |
| 5 | Verify `aud` includes your `client_id` |
| 6 | Verify `exp > now` (with small clock skew, e.g., 60s) |
| 7 | Verify `nonce` matches what you sent |
| 8 | (Optional) Verify `at_hash` against access token |
| 9 | Use `sub` as the stable user ID |

> **Use a library** (`oidc-client`, `Authlib`, `passport-openidconnect`, `omniauth-openid-connect`, `aws-sdk-cognitoidentityprovider`). Don't roll your own JWT validation.

**PKCE (`code_challenge`) — required for public clients:**

| Concept | Detail |
|---|---|
| `code_verifier` | Random 43–128 char string the client generates |
| `code_challenge` | `BASE64URL(SHA256(code_verifier))` |
| `code_challenge_method` | `S256` (preferred) or `plain` (deprecated) |
| Sent on `/authorize` | `code_challenge` |
| Sent on `/token` | `code_verifier` |
| IdP recomputes hash, compares | Defends against authorization-code interception |

> PKCE is **mandatory** for public clients (mobile apps, SPAs) and **recommended** for confidential clients too. RFC 7636.

**OAuth 2.0 / OIDC flows — when to use which:**

| Flow | Use |
|---|---|
| **Authorization Code + PKCE** | **Default for everything** (web apps, SPAs, mobile, confidential + public) |
| Implicit | **Deprecated** (tokens in URL fragment — leaks via referrer / history) |
| Resource Owner Password Credentials | **Deprecated** (app sees the password) |
| Client Credentials | Service-to-service (no user) |
| Device Code | TVs, CLI tools, IoT |
| Hybrid | Older, complex; rarely needed today |
| Backend-for-Frontend (BFF) | SPA + server-side session — increasingly recommended pattern |

**Single Sign-On (SSO) flow:**

```
User → App A: OIDC login → IdP (already has session) → returns immediately
User → App B (same IdP): OIDC login → IdP (still has session) → returns immediately
```

> One IdP session covers many apps. **Logout** should explicitly hit the IdP to end the session everywhere — single logout (SLO) is harder but standardized in OIDC.

**Common providers:**

| Provider | Notes |
|---|---|
| **Google** | Free; OIDC-compliant |
| **Microsoft Entra ID** (formerly Azure AD) | Enterprise SSO |
| **Okta** | Identity-as-a-Service |
| **Auth0** | Same niche, devops-friendly |
| **Keycloak** | Open-source self-host |
| **AWS Cognito** | AWS-integrated |
| **Apple ID** ("Sign in with Apple") | Privacy-focused |
| **GitHub** | Has OAuth 2.0; OIDC is partial (use OAuth) |
| **GitLab** | OIDC-compliant; popular for CI federation |

**OIDC discovery (`/.well-known/openid-configuration`):**

| Field | Use |
|---|---|
| `issuer` | The IdP's canonical URL |
| `authorization_endpoint` | Where to redirect users |
| `token_endpoint` | Code-for-tokens exchange |
| `userinfo_endpoint` | Get full user profile (with access token) |
| `jwks_uri` | Public keys for JWT verification |
| `end_session_endpoint` | RP-initiated logout |
| `revocation_endpoint` | Revoke a refresh / access token |
| `introspection_endpoint` | Resource server checks an opaque token |
| `scopes_supported` / `claims_supported` | What's available |

**Where to store tokens (browser SPA):**

| Option | Pros | Cons |
|---|---|---|
| `localStorage` | Survives refresh | XSS reads it; not a great idea |
| `sessionStorage` | Same plus session-bound | Same XSS risk |
| Cookie (`HttpOnly` + `Secure` + `SameSite=Strict`) | Not readable by JS | CSRF needs care |
| **Server-side session (BFF)** | Tokens never reach the browser | Most secure modern recommendation |
| In-memory only | Lost on refresh | Bad UX for non-trivial apps |

> **Modern best practice for SPAs: Backend-for-Frontend (BFF) pattern** — exchange the OIDC code on the server; store tokens server-side; browser only sees a session cookie.

**Refresh tokens:**

| Concern | Detail |
|---|---|
| Use `offline_access` scope to receive one | Optional |
| Store **server-side only** | Never in browser |
| Rotation on use | Old refresh token invalidated when new one issued |
| Long-lived | Days to months |
| Revoke on logout / suspicious activity | `/revocation_endpoint` |
| Detection of theft | If a stale refresh token is presented, invalidate the family |

**Logout — three flavors:**

| Type | Detail |
|---|---|
| **App-only logout** | Clear local session; user still signed in at IdP |
| **RP-initiated logout** (OIDC RP-Initiated Logout) | Redirect to `end_session_endpoint` to log out at IdP |
| **Single logout** (back-channel / front-channel) | IdP notifies all RPs; complex, fragile |

**Common claims you map to your DB:**

| OIDC | Your DB |
|---|---|
| `sub` | `external_id` (composite with `iss` if multi-IdP) |
| `email` (verified) | `email` |
| `name` | `name` |
| `picture` | `avatar_url` (cache to your storage if you can) |
| `groups` / `roles` (if provider supplies) | role mapping |

**Multi-IdP with the same email — pitfall:**

| Concern | Detail |
|---|---|
| Two providers can both emit the same `email` | Don't merge accounts on email alone |
| Unique key | `(iss, sub)` is the only stable identity |
| Account linking flow | Verify control via second factor before merging |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Skipping nonce / state validation | CSRF / replay attacks |
| Trusting unsigned ID tokens | Spoofed identity |
| Using only `email` as identity | Account hijack via email |
| Storing tokens in `localStorage` | Trivial XSS theft |
| Long-lived access tokens | Bigger blast radius if leaked |
| Implicit flow on a new project | Deprecated; use Authorization Code + PKCE |
| Same `client_id` for prod + dev | Test users authenticate against prod |
| Forgetting to revoke refresh tokens on logout | User stays signed in elsewhere |
| Not validating `aud` | Token issued for app A accepted by app B |
| Static client secrets in mobile apps | Use PKCE; treat as public client |

**Common interview questions / scenarios:**

| Question | Answer |
|---|---|
| Difference between OIDC and OAuth 2.0? | OIDC adds authentication (ID token + standard claims); OAuth 2.0 is authorization-only |
| Why PKCE? | Defends against authorization-code interception in public clients; required for SPAs/mobile |
| Where to store tokens in a SPA? | Server-side via BFF; HttpOnly cookie pattern |
| How to validate an ID token? | Verify signature against JWKS, check `iss` / `aud` / `exp` / `nonce` |
| Refresh-token rotation? | Each use invalidates previous; detect theft via stale-token presentation |
| SSO across multiple apps? | Same IdP session; OIDC handles redirect flow seamlessly |

**Tools & libraries:**

| Stack | Library |
|---|---|
| Ruby / Rails | `omniauth-openid-connect`, `doorkeeper-openid_connect` (provider) |
| Python | `Authlib`, `python-jose` (JWT only) |
| Node | `passport-openidconnect`, `openid-client`, NextAuth.js, Auth.js |
| Java | Spring Security OAuth2 / OIDC |
| Go | `coreos/go-oidc`, `golang.org/x/oauth2` |
| .NET | `Microsoft.AspNetCore.Authentication.OpenIdConnect` |
| SPA | `oidc-client-ts`, `oidc-react`, NextAuth.js |
| Mobile | AppAuth (iOS / Android), MSAL (Microsoft), AWS Amplify |

**Cross-references:**

- TLS / cert lifecycle: [tls_certificate_management.md](../../devops/security/tls_certificate_management.md)
- Zero trust networking: [zero_trust_*.md](../../devops/security/zero_trust_network_security.md)
- API authn / authz: [csrf_*.md](../../web_security/csrf_cross_site_request_forgery_samesite_token_rails.md)
- AWS IAM cross-account / OIDC federation: [aws_iam_*.md](../../devops/cloud_aws/aws_iam_identity_access_management_roles_policies_oidc_cross_account.md)

**Rule of thumb:** **OIDC for authentication, OAuth 2.0 for API authorization** — and OIDC is built on OAuth 2.0, so you usually get both. **Authorization Code + PKCE is the default for everything**; never use Implicit. **Validate ID tokens** (signature, `iss`, `aud`, `exp`, `nonce`) — use a library. **Tokens out of the browser** via Backend-for-Frontend pattern is the modern secure default for SPAs.
