### How to maintain a session (short)

**Common approaches:**
- **Cookie-based sessions**: store a signed (or encrypted) session in the cookie.
- **Server-side sessions**: store data in Redis/DB; cookie holds the session ID.

**Key pieces:**
- Session ID, secure cookie flags (`HttpOnly`, `Secure`, `SameSite`).
- Rotation on login to prevent session fixation.

**Rule of thumb:** keep session data minimal and rotate IDs on privilege changes.
