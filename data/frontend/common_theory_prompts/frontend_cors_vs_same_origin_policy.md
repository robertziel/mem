### CORS vs Same-Origin Policy

Same-Origin Policy (SOP) blocks cross-origin reads by default; CORS is the opt-in relaxation via headers.

- **Key point** -> SOP protects data from other origins.
- **Key point** -> CORS allows cross-origin requests if server returns headers.
- **Gotcha** -> Non-simple requests trigger a preflight (OPTIONS) call.

Example:
```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST
```
