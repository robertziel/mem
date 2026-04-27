### Scope

Scope defines where variables are accessible in code (global, function, block).

- **Key point** -> `let`/`const` are block-scoped; `var` is function-scoped.
- **Key point** -> Inner scopes can access outer variables (lexical scope).
- **Gotcha** -> `var` leaks outside blocks.

Example:
```js
if (true) {
  let x = 1;
  var y = 2;
}
// x is not defined, y is defined
```
