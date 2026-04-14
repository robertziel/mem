### Inheritance

Some CSS properties inherit from the parent (like `color`, `font-family`).

- **Key point** -> Layout properties generally do not inherit.
- **Key point** -> `inherit` and `initial` can force behavior.
- **Gotcha** -> Inherited `line-height` can affect nested elements.

Example:
```css
body { line-height: 1.5; }
button { line-height: inherit; }
```
