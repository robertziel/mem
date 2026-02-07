### Critical Rendering Path

The critical rendering path is the minimum set of steps and resources needed to render the first view.

- **Key point** -> HTML and CSS block first render; large CSS is especially costly.
- **Key point** -> JS that blocks parsing can delay first paint.
- **Gotcha** -> Inlining too much can bloat HTML and slow time-to-first-byte.

Example:
```html
<link rel="preload" href="/critical.css" as="style">
<link rel="stylesheet" href="/critical.css">
<script defer src="/app.js"></script>
```
