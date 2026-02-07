### ARIA

ARIA adds semantics when native HTML can’t express the role or state.

- **Key point** -> Prefer native elements first.
- **Key point** -> ARIA roles/states describe behavior to assistive tech.
- **Gotcha** -> Incorrect ARIA can be worse than none.

Example:
```html
<button aria-expanded="false" aria-controls="menu">Menu</button>
```
