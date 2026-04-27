### Controlled Re-render

Controlled re-renders keep updates scoped to the smallest necessary UI.

- **Key point** -> Lift state only when needed.
- **Key point** -> Memoize expensive components.
- **Gotcha** -> Over-memoization can add complexity without gains.

Example:
```jsx
const Item = React.memo(function Item({ value }) {
  return <li>{value}</li>;
});
```
