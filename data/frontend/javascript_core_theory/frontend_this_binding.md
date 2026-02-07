### this Binding

`this` is set by the call site, not where the function is defined.

- **Key point** -> Methods use the object as `this`.
- **Key point** -> Arrow functions capture `this` from outer scope.
- **Gotcha** -> `this` is undefined in strict mode for plain function calls.

Example:
```js
const obj = { n: 1, f() { return this.n; } };
obj.f(); // 1
```
