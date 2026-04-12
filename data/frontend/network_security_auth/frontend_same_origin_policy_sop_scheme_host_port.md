### Same-Origin Policy

SOP blocks scripts from reading data from other origins.

- **Key point** -> Origin = scheme + host + port.
- **Key point** -> Prevents cross-site data leaks.
- **Gotcha** -> Does not block sending requests, only reading responses.

Example:
```text
https://a.com:443 != http://a.com:443 != https://a.com:8443
```
