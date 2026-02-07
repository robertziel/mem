### Hooks

Hooks let function components use state and lifecycle features.

- **Key point** -> Must be called at the top level.
- **Key point** -> Custom hooks share logic.
- **Gotcha** -> Hook order must remain consistent.

Example:
```jsx
function useToggle() {
  const [on, setOn] = useState(false);
  return [on, () => setOn(v => !v)];
}
```
