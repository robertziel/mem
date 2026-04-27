### Critical CSS

Critical CSS inlines the styles needed for above-the-fold content.

- **Key point** -> Reduces render-blocking requests.
- **Key point** -> Inline only what’s necessary.
- **Gotcha** -> Too much inlining bloats HTML.

Example:
```html
<style>header{display:flex} .hero{min-height:60vh}</style>
```
