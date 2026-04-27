### Immutability

Immutability means not changing existing objects; instead create new ones.

- **Key point** -> Helps predictability and time-travel debugging.
- **Key point** -> Enables referential equality checks.
- **Gotcha** -> Deep copies can be expensive.

Example:
```js
const state = { count: 1 };
const next = { ...state, count: 2 };
```
