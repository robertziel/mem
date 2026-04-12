### Status Codes

Status codes indicate result of a request.

- **Key point** -> 2xx success, 3xx redirect, 4xx client error, 5xx server error.
- **Key point** -> 304 = cached response.
- **Gotcha** -> 200 for errors breaks clients.

Example:
```http
HTTP/1.1 404 Not Found
```
