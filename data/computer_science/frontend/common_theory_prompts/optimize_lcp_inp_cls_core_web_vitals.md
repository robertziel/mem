### Optimize LCP, INP, CLS

LCP: speed up the largest visible element; INP: reduce long tasks; CLS: prevent layout shifts.

- **Key point** -> Preload hero images and critical CSS for LCP.
- **Key point** -> Break up long JS tasks for INP.
- **Gotcha** -> Missing image dimensions cause CLS.

Example:
```html
<img src="/hero.jpg" width="1200" height="600" loading="eager">
```
