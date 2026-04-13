### Source Maps

Source maps map compiled code back to original sources for debugging.

- **Key point** -> Useful for production error traces.
- **Key point** -> Should be protected if they expose source.
- **Gotcha** -> Public source maps can leak code.

Example:
```text
app.js -> app.js.map
```
