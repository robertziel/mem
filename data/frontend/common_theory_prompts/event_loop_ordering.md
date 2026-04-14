### Event Loop Ordering

Microtasks (Promises) run before macrotasks (setTimeout) after the current call stack finishes.

- **Key point** -> Promise callbacks flush before timers.
- **Key point** -> Long microtask chains can starve rendering.
- **Gotcha** -> setTimeout(0) is still deferred behind microtasks.

Example:
```js
console.log("A");
Promise.resolve().then(() => console.log("B"));
setTimeout(() => console.log("C"), 0);
// Output: A, B, C
```
