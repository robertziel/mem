### Macrotask vs Microtask

Microtasks run after the current stack, before the next macrotask.

- **Key point** -> Promises queue microtasks.
- **Key point** -> setTimeout/IO are macrotasks.
- **Gotcha** -> Microtask floods can delay rendering.

Example:
```js
queueMicrotask(() => console.log("micro"));
setTimeout(() => console.log("macro"), 0);
```
