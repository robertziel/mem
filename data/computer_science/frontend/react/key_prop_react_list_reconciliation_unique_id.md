### React key Prop

`key` helps React track items in lists for efficient reconciliation.

- **Key point** -> Use stable, unique IDs (not array indexes).
- **Key point** -> Keys prevent unnecessary re-renders and state bugs.
- **Gotcha** -> Changing keys remounts components and resets state.

Example:
```jsx
{items.map(item => (
  <Row key={item.id} item={item} />
))}
```
