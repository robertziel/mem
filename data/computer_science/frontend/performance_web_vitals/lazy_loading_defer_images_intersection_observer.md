### Lazy Loading

Lazy loading defers non-critical resources until needed.

- **Key point** -> Improves initial load performance.
- **Key point** -> Use for images and routes.
- **Gotcha** -> Overuse can delay content users expect.

Example:
```html
<img src="/photo.jpg" loading="lazy" width="800" height="600">
```
