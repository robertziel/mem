### Execution Context

An execution context is the environment where JS code is evaluated (global, function, or eval).

- **Key point** -> Each function call creates a new context.
- **Key point** -> Context holds `this`, scope chain, and variables.
- **Gotcha** -> `this` depends on how a function is called.

Example:
```js
function f() { console.log(this); }
const obj = { f };
obj.f(); // this === obj
f();     // this === global/undefined (strict)
```
