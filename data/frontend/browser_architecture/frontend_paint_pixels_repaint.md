### Paint

Paint draws pixels for visual elements after layout is complete.

- **Key point** -> Changes to color, shadows, or backgrounds trigger paint.
- **Key point** -> Paint can be costly for large areas or complex effects.
- **Gotcha** -> Excessive box-shadow and blur can be expensive.

Example:
```css
.card { background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
```
