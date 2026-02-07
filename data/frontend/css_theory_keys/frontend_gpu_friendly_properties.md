### GPU-Friendly Properties

Transforms and opacity are typically GPU-accelerated and avoid layout.

- **Key point** -> `transform` and `opacity` are cheap to animate.
- **Key point** -> Avoid animating `top/left/width/height`.
- **Gotcha** -> Too many layers can increase memory use.

Example:
```css
.card { transition: transform 150ms ease, opacity 150ms ease; }
```
