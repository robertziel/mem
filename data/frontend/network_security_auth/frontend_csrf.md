### CSRF

CSRF tricks a user’s browser into sending authenticated requests.

- **Key point** -> Use SameSite cookies and CSRF tokens.
- **Key point** -> Protect state-changing routes (POST/PUT/DELETE).
- **Gotcha** -> JSON APIs can still be vulnerable.

Example:
```html
<input type="hidden" name="csrf" value="token123">
```
