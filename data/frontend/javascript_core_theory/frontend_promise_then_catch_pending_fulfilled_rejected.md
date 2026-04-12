### Promise

A Promise represents a value that may be available now, later, or never.

- **Key point** -> States: pending -> fulfilled/rejected.
- **Key point** -> `then` queues microtasks.
- **Gotcha** -> Unhandled rejections can be noisy and break flows.

Example:
```js
fetch("/api")
  .then(r => r.json())
  .then(data => console.log(data));
```
