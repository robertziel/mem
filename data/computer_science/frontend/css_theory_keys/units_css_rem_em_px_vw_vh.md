### CSS Units

CSS units define lengths: absolute (px) and relative (em, rem, %, vw/vh).

- **Key point** -> `rem` scales with root font size.
- **Key point** -> `%` is relative to the parent.
- **Gotcha** -> `em` compounds based on parent font size.

Example:
```css
html { font-size: 16px; }
h1 { font-size: 2rem; } /* 32px */
```
