### CSRF (Cross-Site Request Forgery)

**What CSRF is:**
- Attacker tricks user's browser into making authenticated requests to another site
- Exploits: browser automatically sends cookies with every request to a domain
- User is logged into bank.com; attacker's page submits a hidden form to bank.com

**Attack example:**
```html
<!-- On evil.com — user visits this page while logged into bank.com -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account">
  <input type="hidden" name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>
<!-- Browser sends bank.com session cookie automatically → transfer executes -->
```

**Prevention methods:**

**1. SameSite cookies (modern, simplest):**
```
Set-Cookie: session=abc123; SameSite=Strict; HttpOnly; Secure
```
| Value | Behavior |
|-------|----------|
| Strict | Cookie never sent in cross-site requests (safest, breaks some flows) |
| Lax | Cookie sent for top-level navigation GET (default in modern browsers) |
| None | Always sent (must use Secure flag, needed for cross-site iframes) |

**2. CSRF token (traditional, still widely used):**
```ruby
# Rails built-in CSRF protection
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
end
```
```erb
<!-- Rails auto-includes in forms -->
<form action="/transfer" method="POST">
  <input type="hidden" name="authenticity_token" value="<random_token>">
  ...
</form>
```
- Server generates random token per session
- Token included in every state-changing request (POST, PUT, DELETE)
- Server validates token matches → rejects if missing/wrong

**3. Double-submit cookie:**
```
Set-Cookie: csrf_token=abc123
Request header: X-CSRF-Token: abc123
Server: compare cookie value == header value
```
- Attacker can't read the cookie value (same-origin policy)
- So attacker can't set the correct header

**4. Check Origin/Referer header:**
```ruby
before_action :verify_origin

def verify_origin
  origin = request.headers['Origin'] || request.headers['Referer']
  unless origin&.start_with?('https://myapp.com')
    head :forbidden
  end
end
```

**API mode (no CSRF needed when):**
- Using Bearer token auth (not cookies) — no automatic credential sending
- Using API keys in headers — attacker can't inject custom headers cross-origin
- CSRF only matters when auth is cookie-based

**Rule of thumb:** SameSite=Lax cookies are the modern baseline (default in Chrome/Firefox). Add CSRF tokens for cookie-based auth (Rails does this by default). API-only with Bearer tokens doesn't need CSRF protection. Never use GET for state-changing operations.
