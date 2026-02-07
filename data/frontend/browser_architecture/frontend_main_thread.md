### Main Thread

The main thread runs JS, style calculation, layout, and paint work.

- **Key point** -> Long tasks block input and animation.
- **Key point** -> Keeping JS under ~50ms helps responsiveness.
- **Gotcha** -> Heavy JS and layout together cause jank.

Example:
```js
// Offload heavy work
const worker = new Worker("/worker.js");
worker.postMessage(hugeData);
```
