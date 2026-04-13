### Prototype Chain

Objects inherit properties through the prototype chain.

- **Key point** -> `obj.__proto__` points to its prototype.
- **Key point** -> Lookup walks up the chain until found or null.
- **Gotcha** -> Shadowing hides prototype properties.

Example:
```js
const a = { x: 1 };
const b = Object.create(a);
b.x; // 1 via prototype
```
