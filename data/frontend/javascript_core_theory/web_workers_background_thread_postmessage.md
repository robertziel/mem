### Web workers (short)

Web workers run JavaScript in a background thread.

- Keep heavy work off the main UI thread.
- Communicate via `postMessage`.

```javascript
const worker = new Worker("worker.js")
worker.postMessage({ job: "parse" })
```

**Rule of thumb:** use workers for CPU-heavy tasks, not DOM access.
