### Islands Architecture

Islands architecture renders mostly static HTML with small interactive islands.

- **Key point** -> Improves performance by limiting JS hydration.
- **Key point** -> Interactive widgets are isolated.
- **Gotcha** -> Requires framework support or build tooling.

Example:
```html
<!-- static page -->
<div id="counter" data-island></div>
```
