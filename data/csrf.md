### CSRF (Cross-Site Request Forgery) (short)

**What it is:**
- An attacker tricks a logged-in user’s browser into sending a state-changing request.

**Why it works:**
- The browser automatically includes cookies/session tokens.

**Mitigations:**
- CSRF tokens, SameSite cookies, and checking the `Origin`/`Referer` header.

**Rule of thumb:** require a per-request token for non-GET actions.
