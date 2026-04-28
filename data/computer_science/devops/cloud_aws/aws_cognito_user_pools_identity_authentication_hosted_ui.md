### AWS Cognito — User Pools, Identity Pools, Hosted UI

**Definition:** AWS's managed user authentication and authorization. **User Pools** = "who are you?" (sign-in/up + JWT tokens + hosted UI + MFA + federation). **Identity Pools** = "what AWS resources can you access?" (exchange tokens for temp AWS credentials). Use User Pool when you're on AWS and need managed auth without a separate vendor; use Auth0 / Devise / Firebase otherwise.

**Two main components:**

| Component | Purpose | Question |
|---|---|---|
| **User Pool** | Managed user directory | "Who are you?" (authentication) |
| **Identity Pool** | Federated identity for AWS resources | "What AWS resources can you access?" (authorization) |

**User Pool — what it does:**

| Feature | Detail |
|---|---|
| Managed user directory | Sign up, sign in, password recovery |
| **JWT tokens** issued | ID token, access token, refresh token |
| **Hosted UI** for login / signup | Customizable, OAuth-style |
| **MFA** support | SMS, TOTP (passkeys / WebAuthn supported) |
| **Federation** | Google, Facebook, Apple, SAML, OIDC IdPs |
| **Triggers** (Lambda) | Pre-signup, post-confirmation, custom message |
| **User attributes** | Custom + standard (email, phone) |
| **Groups** | Role-like grouping |

**User Pool flow (typical web app):**

```
   User
     │
     ▼
   ┌────────────────────────────┐
   │ Cognito Hosted UI            │ (or your custom login form)
   └─────────────┬──────────────┘
                 │ user authenticates
                 ▼
   ┌────────────────────────────┐
   │ User Pool                    │ → JWT tokens (ID, access, refresh)
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │ App / API Gateway / ALB     │ ← validates JWT via JWKS
   └────────────────────────────┘
```

**Identity Pool — what it does:**

| Feature | Detail |
|---|---|
| Exchange Cognito / social tokens for **temp AWS credentials** | STS-backed |
| Grants IAM roles to authenticated + unauthenticated users | Per-pool config |
| Use case | Direct S3 upload from browser, IoT, mobile to AWS resources |
| Federation sources | User Pool, Google, Facebook, Apple, SAML, OIDC, anonymous |

**Identity Pool flow:**

```
   User
     │
     ▼
   ┌────────────────────────────┐
   │ Cognito User Pool (or social) │ → JWT
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │ Identity Pool                │ → temp AWS credentials
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │ S3 / DynamoDB / IoT          │ via SDK
   └────────────────────────────┘
```

**When to use each:**

| Need | Solution |
|---|---|
| User sign-up/sign-in for app | **User Pool** |
| Social login (Google / Facebook) | User Pool + federation |
| Grant users direct AWS resource access | User Pool + Identity Pool |
| Machine-to-machine auth (services) | **Use IAM, not Cognito** |
| Internal admin tool | Cognito or simpler (Devise, Auth0) |
| Mobile app with offline support | User Pool + AWS Amplify |
| API-only B2B | User Pool with M2M / client credentials |

**JWT tokens issued (User Pool):**

| Token | Contains | Use for |
|---|---|---|
| **ID token** | User attributes (email, name, groups) | Frontend display, user info |
| **Access token** | Scopes, OAuth permissions | API authorization |
| **Refresh token** | Long-lived | Get new access tokens (days–weeks) |

**Token TTLs (Cognito defaults):**

| Token | Default | Configurable |
|---|---|---|
| ID token | 1 hour | 5 min – 24 hours |
| Access token | 1 hour | 5 min – 24 hours |
| Refresh token | 30 days | 60 min – 10 years |

**Integration patterns:**

| Pattern | Detail |
|---|---|
| **API Gateway authorizer** | Verifies JWT signature + expiry automatically |
| **ALB Cognito auth** | ALB intercepts and authenticates before forwarding |
| **AppSync directives** | `@aws_cognito_user_pools` |
| **Lambda authorizer** | Custom logic for token validation |
| **Frontend SDK** (Amplify Auth) | Convenience wrapper |
| **Backend SDK** | Validate JWT in code |

**API Gateway + Cognito example:**

```yaml
# OpenAPI / SAM
securityDefinitions:
  CognitoAuth:
    type: apiKey
    name: Authorization
    in: header
    x-amazon-apigateway-authtype: cognito_user_pools
    x-amazon-apigateway-authorizer:
      type: cognito_user_pools
      providerARNs:
        - arn:aws:cognito-idp:us-east-1:123:userpool/us-east-1_abc

paths:
  /protected:
    get:
      security:
        - CognitoAuth: []
```

**Lambda triggers (User Pool):**

| Trigger | When |
|---|---|
| **Pre-signup** | Auto-confirm certain users, validate domains |
| **Post-confirmation** | Add user to DB, send welcome email |
| **Pre-authentication** | Block by IP, geo, device |
| **Post-authentication** | Log access, MFA enforcement |
| **Pre-token-generation** | Customize token claims |
| **Custom message** | Customize signup / reset email content |
| **User migration** | Migrate users from old auth on first login |
| **Define / Create / Verify auth challenge** | Custom auth flows (passwordless, MFA, captcha) |

**MFA options:**

| Type | Detail |
|---|---|
| **SMS** | Weak (SIM swap risk) |
| **TOTP** | Authenticator apps (Google, Authy) |
| **Adaptive auth** | ML-based risk score (Cognito Advanced Security) |
| **WebAuthn / passkeys** | Phishing-resistant (newer support) |

**Federation — bring users from elsewhere:**

| IdP type | Detail |
|---|---|
| **Google / Facebook / Apple / Amazon** | Built-in social |
| **SAML 2.0** | Enterprise IdPs (Okta, Azure AD) |
| **OIDC** | Custom OIDC providers |
| **Custom (Lambda)** | Your own IdP |

**Cognito vs alternatives:**

| Feature | **Cognito** | **Auth0** | **Firebase Auth** | **Devise** (self-hosted) |
|---|---|---|---|---|
| Cost | **Tiered post-Nov 2024** (Lite / Essentials / Plus) | Free up to 7.5K MAU | Free up to 10K/mo | Free (self-hosted) |
| AWS integration | Native | SDK | SDK | Manual |
| Hosted UI | Yes (basic) | Yes (polished) | Yes | No (build yourself) |
| Customization | Limited | Extensive | Moderate | Full control |
| Vendor lock-in | AWS | Auth0 | Google | None |
| MFA | Yes | Yes | Yes | Manual |
| Social login | Yes | Yes (more providers) | Yes | Manual / OmniAuth |

**Cognito tier (post-Nov 2024):**

| Tier | What's included |
|---|---|
| **Lite** | Basic auth, smaller MAU free tier |
| **Essentials** | Higher MAU, more features |
| **Plus** | Advanced security, threat protection |

> Always check **current AWS pricing** — has changed multiple times.

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Web app auth** | Cognito Hosted UI + API Gateway authorizer |
| **Mobile app** | Amplify Auth + Cognito User Pool |
| **B2B SaaS with SSO** | Cognito + SAML federation per customer |
| **Direct S3 upload** | Cognito Identity Pool → temp creds → presigned-style |
| **Multi-tenant** | One User Pool per tenant OR groups within one pool |
| **Custom auth flow** | Lambda triggers (passwordless, custom MFA) |
| **User migration** | Migration trigger reads from old DB on first login |

**Cognito limitations:**

| Limit | Detail |
|---|---|
| Hosted UI customization is limited | Logo, colors, CSS only |
| Email + SMS sending built-in but limited | Use SES for serious volume |
| Per-user-pool limits | Max users, custom attributes count |
| Cross-region pools | Don't replicate; multi-region requires app logic |
| Migrations | Manual (or via Lambda trigger) |
| Audit / events | CloudWatch Events available, basic |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Storing tokens in localStorage | XSS = token theft |
| Hard-coding User Pool ID / client ID in repo | OK for ID, not for app secrets |
| Forgetting JWT signature validation | Forged tokens accepted |
| Using ID token for API auth (instead of access token) | Wrong claim model |
| Long refresh token TTL without rotation | Stolen refresh = forever |
| Not enforcing MFA for admins | Account takeover |
| Federation to attacker-controlled IdP | Trust misconfigured |
| Pricing surprise (Hosted UI MAU) | Unexpected bill |
| Cognito for M2M | Use IAM instead |
| One pool for all tenants without isolation | Cross-tenant data leak risk |

**Decision matrix:**

| Need | Pick |
|---|---|
| Already on AWS, need managed auth | **Cognito User Pool** |
| Polished hosted UI | Auth0 |
| Mobile-first | Firebase Auth or Cognito |
| Self-hosted, full control | Devise / Keycloak |
| Direct AWS resource access | Cognito Identity Pool |
| M2M / service auth | IAM (not Cognito) |

**Cross-references:**

- Authentication attacks: [authentication_attacks_*.md](../../web_security/authentication_attacks_brute_force_session.md)
- OIDC / OAuth: [oidc_*.md](../../protocols/security/oidc_oauth_authentication_authorization_flows.md)
- SAML: [saml_*.md](../../protocols/security/saml_enterprise_sso_xml_assertion.md)
- IAM + least privilege: [iam_*.md](iam_roles_policies_least_privilege.md)
- API Gateway + auth: [api_gateway_*.md](api_gateway_routing_auth_throttling.md)

**Rule of thumb:** **Cognito when you're on AWS** and need managed auth without a separate vendor. **User Pool for authentication; add Identity Pool only if users need direct AWS resource access** (S3 upload, IoT). For **simpler Rails apps**, Devise is simpler. For **polished UX**, consider **Auth0**. **For M2M, use IAM, not Cognito**. Always validate JWT **server-side** and never put tokens in **localStorage**.
