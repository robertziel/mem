### Props vs State

Props are inputs from parents; state is local, mutable data.

- **Key point** -> Props are read-only.
- **Key point** -> State updates trigger re-renders.
- **Gotcha** -> Don’t copy props into state unless necessary.

Example:
```jsx
function Card({ title }) {
  const [open, setOpen] = useState(false);
  return <h3>{title}</h3>;
}
```
