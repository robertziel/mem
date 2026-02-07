### HTTP

HTTP is a stateless request-response protocol.

- **Key point** -> Runs over TCP or QUIC (HTTP/3).
- **Key point** -> Statelessness requires tokens/cookies for sessions.
- **Gotcha** -> Each request is independent without state.

Example:
```text
Client -> Request -> Server -> Response
```
