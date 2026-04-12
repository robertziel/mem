### CSRF, SSRF & Access Control

**CSRF (Cross-Site Request Forgery):**
- Attacker tricks user's browser into making authenticated requests to another site
- User is logged into bank.com; attacker's page submits a form to bank.com/transfer

```html
<!-- On evil.com -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>
```

**CSRF prevention:**
- **SameSite cookies** (modern, simplest): `Set-Cookie: session=x; SameSite=Strict`
- **CSRF token**: unique token per session, included in every form/request, validated server-side
- **Double-submit cookie**: CSRF token in both cookie and request header, server compares
- **Check Origin/Referer header**: reject requests from unexpected origins

```ruby
# Rails CSRF protection (built-in)
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
end
# Automatically includes authenticity_token in forms
# API mode: use X-CSRF-Token header or skip_before_action :verify_authenticity_token
```

**SSRF (Server-Side Request Forgery):**
- Attacker tricks the server into making requests to internal resources
- Server fetches a URL provided by user → attacker provides internal URL

```
// User input: url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
// Server fetches AWS metadata endpoint → leaks IAM credentials!
```

**SSRF prevention:**
- Validate and whitelist allowed URLs/domains
- Block requests to internal IPs (10.x, 172.16.x, 192.168.x, 169.254.x, localhost)
- Use allowlist, not blocklist (blocklists are bypassable)
- Disable HTTP redirects in server-side HTTP client
- Use a separate network/proxy for outbound requests

**Broken Access Control (OWASP #1):**

**IDOR (Insecure Direct Object Reference):**
```
GET /api/users/123/orders   # User 123 sees their orders
GET /api/users/456/orders   # User 123 changes ID, sees user 456's orders!
```

**Prevention:**
```ruby
# BAD: trust the URL parameter
Order.find(params[:id])

# GOOD: scope to current user
current_user.orders.find(params[:id])

# GOOD: explicit authorization check
order = Order.find(params[:id])
authorize! :read, order  # raises if not allowed (Pundit/CanCanCan)
```

**Access control patterns:**
- **RBAC (Role-Based)**: user has roles (admin, editor, viewer), roles have permissions
- **ABAC (Attribute-Based)**: policy based on user attributes, resource attributes, context
- **ACL (Access Control List)**: explicit per-resource permission list

**Access control checklist:**
- [ ] Deny by default (whitelist access, don't blacklist)
- [ ] Check authorization on EVERY endpoint (not just UI)
- [ ] Scope queries to current user
- [ ] Don't expose internal IDs in predictable sequences (use UUIDs)
- [ ] Log access control failures (detect enumeration attacks)
- [ ] Rate limit sensitive endpoints

**Rule of thumb:** SameSite cookies are the modern CSRF defense. Block internal IPs for SSRF. Always scope queries to the current user for access control. Deny by default. Authorization must be server-side, never trust the client.
