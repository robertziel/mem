### CSRF (Cross-Site Request Forgery) — SameSite, Tokens, Rails

**What CSRF is:** an attacker's site causes the victim's browser to make an **authenticated** request to *your* site. The browser automatically attaches the victim's cookie, so your server thinks the victim made the request.

> CSRF only matters when authentication is **ambient** — i.e., automatically attached by the browser (cookies). Bearer tokens or API keys in headers don't have this risk.

**Attack shape:**

```html
<!-- attacker.com renders this while victim is logged into bank.com -->
<form action="https://bank.com/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>

<!-- victim's browser auto-sends bank.com session cookie → transfer runs as victim -->
```

**Why GETs are special:** browsers happily send cross-site GETs (image tags, link clicks, redirects). **Never put state-changing logic on GET** — that's CSRF-by-design.

**Defenses, in priority order:**

| Priority | Defense | Strength | When sufficient alone? |
|---|---|---|---|
| **1** | **`SameSite` cookie attribute** | Modern, browser-enforced | Mostly yes; adds defense-in-depth otherwise |
| 2 | **CSRF token (synchronizer pattern)** | Strong, framework-supported | Yes for cookie-auth web apps |
| 3 | **Double-submit cookie** | Strong, stateless | Yes — common for SPA + cookie auth |
| 4 | **Origin / Referer header check** | Useful supplement | Only as defense-in-depth |
| 5 | **Custom request header** (e.g. `X-Requested-With`) | Decent for AJAX | Combine with CORS preflight |
| 6 | **Bearer-token auth instead of cookies** | Eliminates the class | Yes — for API-first products |

**`SameSite` cookie attribute:**

| Value | Cookie sent on... | Cross-site request? | Use |
|---|---|---|---|
| `Strict` | Same-site only | Never | Maximum CSRF protection; can break OAuth callbacks, cross-site nav |
| **`Lax`** (default in modern browsers) | Same-site **+ top-level GET nav from cross-site** | Top-level GET only | **Safe default** for session cookies |
| `None` | Always — but **`Secure` is required** | Yes | Cross-site embeds (iframes, third-party widgets) |

| Header form | Effect |
|---|---|
| `Set-Cookie: session=...; SameSite=Strict; HttpOnly; Secure` | Strictest |
| `Set-Cookie: session=...; SameSite=Lax; HttpOnly; Secure` | Modern default |
| `Set-Cookie: tracker=...; SameSite=None; Secure` | Cross-site explicit opt-in |

> Modern Chrome/Firefox treat **missing `SameSite` as `Lax`** — but always set it explicitly for clarity and audit.

**Synchronizer-token pattern (the classic CSRF token):**

| Property | Detail |
|---|---|
| Generated | Per session (or per request) on the server |
| Stored | Server-side (session) and embedded in HTML form / meta tag |
| Sent | As a hidden form field (`authenticity_token`) or `X-CSRF-Token` header |
| Validated | Compared on the server for every state-changing request |
| Required on | POST / PUT / PATCH / DELETE (never GET) |
| Bypassed when | Login (no session yet), some explicit endpoints |

**Double-submit cookie (stateless variant):**

| Property | Detail |
|---|---|
| Server sets | Random `csrf_token` cookie (readable to JS, not `HttpOnly`) |
| Client sends | Same value in `X-CSRF-Token` header (read from JS) |
| Server validates | `cookie == header` |
| Why secure | Attacker can't read the victim's cookie cross-origin (Same-Origin Policy) → can't set the matching header |
| Why useful | No server-side session state needed |
| Stronger variant | **Signed double-submit** — token = HMAC(secret, session_id); attacker can't forge even with the cookie |

**Origin / Referer check (defense in depth):**

| Header | Behavior |
|---|---|
| `Origin` | Sent on cross-origin requests + non-GET on most browsers; reliable when present |
| `Referer` | Browser-controlled, can be stripped by privacy settings; less reliable |
| Combined check | Allow if `Origin` matches your domain; fall back to `Referer`; otherwise reject |

```ruby
def verify_origin!
  origin = request.headers["Origin"] || request.headers["Referer"]
  return head :forbidden unless origin&.start_with?("https://myapp.com")
end
```

**Custom-header trick:**

| Mechanism | Why it stops CSRF |
|---|---|
| Require `X-Requested-With: XMLHttpRequest` (or any custom header) | Cross-origin forms can't add custom headers; only allowed via CORS preflight |
| CORS preflight blocks unconfigured custom headers | Attacker can't get the preflight to succeed |

> This is **not** sufficient on its own (still possible via misconfigured CORS), but useful as a layered defense.

**Rails framework support:**

| Component | Detail |
|---|---|
| `protect_from_forgery with: :exception` (default in `ApplicationController`) | Raises `InvalidAuthenticityToken` on missing/bad token |
| `<%= csrf_meta_tags %>` in layout | Emits `<meta name="csrf-token">` for SPAs |
| `<%= form_with %>` / `form_for` | Auto-injects `authenticity_token` hidden field |
| `protect_from_forgery prepend: true` | Run before any other before_action |
| `skip_forgery_protection` | For specific endpoints (webhooks) |
| `protect_from_forgery with: :null_session` | API mode — discards session if token bad (graceful degrade) |
| `Rails.application.config.action_controller.default_protect_from_forgery = true` | Default since Rails 5.2 |
| `request.headers["X-CSRF-Token"]` | Where Rails reads the token from AJAX |

**API-only / SPA — when CSRF doesn't apply:**

| Auth scheme | CSRF risk? |
|---|---|
| Cookie-based session | **Yes** — protect with token + SameSite |
| `Authorization: Bearer <jwt>` (header) | **No** — header isn't auto-attached cross-site |
| API key in custom header | **No** — same reason |
| OAuth access token in header | **No** |
| Basic auth via header | **No** for cross-site forgery (browser dialog scope) |
| OAuth token in cookie (some setups) | **Yes** — same as session cookies |

> The general rule: **if the credential is auto-sent by the browser, CSRF applies.**

**Cookie + token coexistence — the modern "safe SPA" recipe:**

| Layer | Setting |
|---|---|
| Session cookie | `HttpOnly; Secure; SameSite=Lax` (or Strict) |
| CSRF token | `csrf` cookie (not HttpOnly) + `X-CSRF-Token` header — double-submit |
| Server validates | Both cookie present **and** matching header on state-changing requests |
| CORS | `Access-Control-Allow-Credentials: true` only for trusted origins; explicit allowlist |

**State-changing methods — what to require token on:**

| Method | Require CSRF defense? |
|---|---|
| GET / HEAD / OPTIONS | **No** (and never put state changes on these) |
| POST / PUT / PATCH / DELETE | **Yes** |
| WebSocket upgrade | Origin check |
| Webhook receiver | No (uses signature verification, not CSRF) |

**Login CSRF — a sneaky variant:**

| Attack | Attacker logs the victim into the *attacker's* account so victim's actions appear under attacker's identity (e.g., saving the attacker's payment method) |
| Defense | Generate a CSRF token for the login form too; tie it to a pre-session cookie |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| State change on GET (`/delete?id=1`) | CSRF-by-design; use POST/DELETE |
| `SameSite=None` without `Secure` | Browser rejects the cookie entirely |
| Same-origin frontend without CORS misconfigured to `*` with credentials | Effective CSRF window opens |
| `protect_from_forgery` skipped on APIs that use cookie auth | Vulnerable |
| Reflecting CSRF token in unauthenticated context | Attacker can read it |
| Using GET-cached responses to determine CSRF state | Cache poisoning |
| Trusting `Referer` alone (often missing) | Bypass via `Referrer-Policy: no-referrer` |
| Token tied to the **wrong** scope (global, not per-session) | Attacker reuses across sessions |
| WebSocket without origin check | CSWSH (cross-site WebSocket hijacking) |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Session cookie has `HttpOnly`, `Secure`, `SameSite=Lax` (or stricter) | ✅ |
| State-changing endpoints require CSRF token | ✅ |
| Token validated **before** business logic | ✅ |
| `Origin` / `Referer` checked as a fallback | ✅ |
| No state changes on GET | ✅ |
| Webhook receivers use signature verification, not session auth | ✅ |
| CORS `Allow-Credentials: true` only for explicit allowed origins | ✅ |
| API-only services use Bearer token, not session cookie | ✅ |

**Rule of thumb:** **`SameSite=Lax` (or `Strict`) is the modern baseline** — it kills most CSRF outright. **Add CSRF tokens** for any cookie-based auth (Rails does it by default). **Never put state changes on GET.** **Bearer tokens in headers** eliminate the class entirely — that's the right model for SPAs and APIs. And remember the implicit rule: **CSRF only matters when the browser auto-attaches the credential**.
