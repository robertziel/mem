### Hoisting

Hoisting moves declarations to the top of their scope at compile time.

- **Key point** -> `var` is hoisted and initialized to `undefined`.
- **Key point** -> `let/const` are hoisted but in TDZ.
- **Gotcha** -> Using `let/const` before declaration throws.

Example:
```js
console.log(a); // undefined
var a = 1;
```
