### Concurrent Rendering (Concept)

Concurrent rendering lets React interrupt and prioritize rendering work.

- **Key point** -> Improves responsiveness under heavy load.
- **Key point** -> Enables features like transitions.
- **Gotcha** -> Effects may run more than once in dev.

Example:
```jsx
startTransition(() => setQuery(next));
```
