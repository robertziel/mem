### Cascade

The cascade resolves which CSS rule applies using origin, specificity, and order.

- **Key point** -> Later rules override earlier ones with same specificity.
- **Key point** -> `!important` jumps the queue.
- **Gotcha** -> Inline styles can be hard to override.

Example:
```css
.btn { color: blue; }
.btn.primary { color: red; }
```
