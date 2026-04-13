### StrictMode

StrictMode highlights potential problems during development.

- **Key point** -> Double-invokes certain lifecycles/effects in dev.
- **Key point** -> Does not affect production.
- **Gotcha** -> Can expose unsafe side effects.

Example:
```jsx
<React.StrictMode><App /></React.StrictMode>
```
