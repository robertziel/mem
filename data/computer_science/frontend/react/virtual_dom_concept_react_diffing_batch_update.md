### Virtual DOM (Concept)

The virtual DOM is a lightweight JS representation of the UI tree.

- **Key point** -> React diffs VDOM trees to update the real DOM.
- **Key point** -> Updates are batched for efficiency.
- **Gotcha** -> Frequent re-renders can still be costly.

Example:
```jsx
setCount(c => c + 1);
```
