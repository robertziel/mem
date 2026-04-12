### Heap

The heap is where objects are allocated; it’s managed by the garbage collector.

- **Key point** -> Objects/arrays/functions live in the heap.
- **Key point** -> References are stored on the stack.
- **Gotcha** -> Memory leaks happen when references stay alive unintentionally.

Example:
```js
let cache = {};
function remember(k, v){ cache[k] = v; }
```
