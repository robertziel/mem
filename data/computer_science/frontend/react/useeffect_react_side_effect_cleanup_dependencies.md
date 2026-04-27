### useEffect

`useEffect` runs side effects after render and cleans up on re-run/unmount.

- **Key point** -> Runs after paint (non-blocking).
- **Key point** -> Cleanup runs before next effect.
- **Gotcha** -> Missing deps cause stale values.

Example:
```jsx
useEffect(() => {
  const id = setInterval(refresh, 1000);
  return () => clearInterval(id);
}, []);
```
