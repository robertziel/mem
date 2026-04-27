### Event Loop

The event loop runs tasks from queues after the call stack is empty.

- **Key point** -> Microtasks (Promises) run before macrotasks (timers).
- **Key point** -> Rendering happens between task turns.
- **Gotcha** -> Long tasks block input and painting.

Example:
```js
setTimeout(() => console.log("timer"), 0);
Promise.resolve().then(() => console.log("micro"));
// logs: micro, timer
```
