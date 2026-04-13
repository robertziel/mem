### AWS Cognito

**What Cognito does:**
- Managed user authentication and authorization
- User sign-up, sign-in, MFA, social login, SAML/OIDC federation
- Two main components: User Pools and Identity Pools

**User Pools (authentication — "who are you"):**
- Managed user directory (sign up, sign in, password recovery)
- Returns JWT tokens (ID token, access token, refresh token)
- Built-in hosted UI for login/signup pages
- MFA support (SMS, TOTP)
- Social federation (Google, Facebook, Apple, SAML, OIDC)

```
User → Cognito Hosted UI → Authenticate → JWT tokens → API Gateway / ALB → App
```

**Identity Pools (authorization — "what AWS resources can you access"):**
- Exchange Cognito/social tokens for temporary AWS credentials
- Grants IAM roles to authenticated and unauthenticated users
- Use for: direct S3 upload from browser, IoT, mobile access to AWS resources

```
User → Cognito User Pool (JWT) → Identity Pool → Temporary AWS credentials → S3, DynamoDB
```

**When to use which:**
| Need | Solution |
|------|---------|
| User sign-up/sign-in for web/mobile app | User Pool |
| Social login (Google, Facebook) | User Pool + federation |
| Grant users access to AWS resources (S3, DynamoDB) | User Pool + Identity Pool |
| Machine-to-machine auth | Use IAM, not Cognito |
| Internal admin tool | Consider Cognito or simpler (Devise, Auth0) |

**Token types:**
| Token | Contains | Use for |
|-------|----------|---------|
| ID token | User attributes (email, name, groups) | Frontend display, passing user info |
| Access token | Scopes, permissions | API authorization |
| Refresh token | Long-lived, used to get new tokens | Token refresh (days-weeks) |

**Integration with API Gateway:**
```
Client → API Gateway → Cognito Authorizer (validates JWT) → Lambda / Backend
```
- API Gateway verifies the JWT signature and expiry automatically
- No custom auth code needed

**Integration with ALB:**
- ALB can authenticate users via Cognito before forwarding to targets
- Built-in OIDC support, no application code changes

**Cognito vs alternatives:**
| Feature | Cognito | Auth0 | Firebase Auth | Devise (self-hosted) |
|---------|---------|-------|---------------|---------------------|
| Cost | Free up to 50K MAU | Free up to 7.5K MAU | Free up to 10K/month | Free (self-hosted) |
| AWS integration | Native | SDK | SDK | Manual |
| Hosted UI | Yes (basic) | Yes (polished) | Yes | No (build yourself) |
| Customization | Limited | Extensive | Moderate | Full control |
| Vendor lock-in | AWS | Auth0 | Google | None |

**Rule of thumb:** Use Cognito when you're on AWS and need managed auth without a separate vendor. User Pool for authentication, add Identity Pool only if users need direct AWS resource access. For simple Rails apps, Devise is simpler. For polished UX requirements, consider Auth0.
