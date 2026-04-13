### Context

Context provides a way to pass data through the tree without props drilling.

- **Key point** -> Use for global-ish data (theme, auth).
- **Key point** -> Updates re-render consuming components.
- **Gotcha** -> Too many context updates can cause broad re-renders.

Example:
```jsx
const ThemeContext = createContext("light");
```
