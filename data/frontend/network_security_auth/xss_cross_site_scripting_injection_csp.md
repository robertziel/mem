### XSS

XSS lets attackers run scripts in your users’ browsers.

- **Key point** -> Escape/encode untrusted content.
- **Key point** -> Use CSP to limit script sources.
- **Gotcha** -> DOM-based XSS can bypass server filters.

Example:
```html
Content-Security-Policy: script-src 'self'
```
