### CSS Grid

Grid lays out items in two dimensions with rows and columns.

- **Key point** -> Use `grid-template-columns` to define tracks.
- **Key point** -> Items can span with `grid-column: 1 / 3`.
- **Gotcha** -> Implicit grid tracks can be created unexpectedly.

Example:
```css
.grid { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
```
