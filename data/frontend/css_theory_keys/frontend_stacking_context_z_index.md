### Stacking Context and z-index

Stacking contexts define how elements layer visually.

- **Key point** -> `position` + `z-index` creates ordering inside a context.
- **Key point** -> New stacking contexts are created by `transform`, `opacity < 1`, etc.
- **Gotcha** -> z-index only works within the same stacking context.

Example:
```css
.modal { position: fixed; z-index: 1000; }
```
