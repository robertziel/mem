### CSS Variables

CSS variables (custom properties) enable reusable values with runtime updates.

- **Key point** -> Defined with `--name` and read with `var()`.
- **Key point** -> Can be scoped to a selector.
- **Gotcha** -> Undefined vars fall back to `var(--x, fallback)`.

Example:
```css
:root { --brand: #1e40af; }
.button { color: var(--brand); }
```
