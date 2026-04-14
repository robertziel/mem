### Controlled vs Uncontrolled Inputs

Controlled inputs store value in React state; uncontrolled use the DOM.

- **Key point** -> Controlled inputs enable validation and formatting.
- **Key point** -> Uncontrolled inputs are simpler and can be faster.
- **Gotcha** -> Mixing both can cause bugs.

Example:
```jsx
<input value={name} onChange={e => setName(e.target.value)} />
```
