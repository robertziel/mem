### Derived State

Derived state is computed from props/state instead of stored separately.

- **Key point** -> Prefer computed values over duplicating state.
- **Key point** -> Use memoization if computation is expensive.
- **Gotcha** -> Duplicated state can drift and cause bugs.

Example:
```jsx
const fullName = `${first} ${last}`; // derived
```
