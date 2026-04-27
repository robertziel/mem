### JSX

JSX is syntax sugar for `React.createElement` calls.

- **Key point** -> Must return a single root element.
- **Key point** -> Expressions go inside `{}`.
- **Gotcha** -> JSX is not HTML (e.g., `className`).

Example:
```jsx
const el = <button className="btn">Save</button>;
```
