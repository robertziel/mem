### CORS

CORS lets servers allow cross-origin requests with specific headers.

- **Key point** -> Browser enforces CORS; server opts in.
- **Key point** -> Non-simple requests trigger preflight.
- **Gotcha** -> `*` can’t be used with credentials.

Example:
```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```
