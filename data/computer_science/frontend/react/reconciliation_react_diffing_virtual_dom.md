### Reconciliation

Reconciliation is React’s diffing process to update the DOM efficiently.

- **Key point** -> It compares new vs old virtual DOM trees.
- **Key point** -> Keys guide list diffing.
- **Gotcha** -> Deep tree re-renders can be expensive.

Example:
```jsx
setState(prev => ({ ...prev, open: true }));
```
