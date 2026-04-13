### Compositing

Compositing combines already-painted layers into the final screen image, often on the GPU.

- **Key point** -> Layers are merged into the final frame without re-running layout.
- **Key point** -> Transforms and opacity can often be composited cheaply.
- **Gotcha** -> Too many layers can increase memory and hurt performance.

Example:
```css
.card {
  will-change: transform; /* promote to its own layer */
  transform: translateZ(0);
}
```
