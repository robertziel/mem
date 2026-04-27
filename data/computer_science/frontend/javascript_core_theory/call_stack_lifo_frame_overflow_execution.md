### Call Stack

The call stack tracks nested function calls in LIFO order.

- **Key point** -> Each function call pushes a frame; returns pop it.
- **Key point** -> Deep recursion can overflow the stack.
- **Gotcha** -> Long sync work blocks the event loop.

Example:
```js
function a(){ b(); }
function b(){ c(); }
function c(){ return; }
a(); // stack: a -> b -> c
```
