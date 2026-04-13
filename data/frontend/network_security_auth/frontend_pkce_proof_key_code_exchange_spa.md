### PKCE

PKCE is an OAuth extension that secures public clients (SPA/mobile).

- **Key point** -> Uses a code verifier and code challenge.
- **Key point** -> Prevents authorization code interception.
- **Gotcha** -> Must store verifier securely until token exchange.

Example:
```text
verifier -> SHA256 -> challenge
```
