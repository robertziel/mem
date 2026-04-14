### Layout (Reflow)

Layout computes element sizes and positions based on the render tree.

- **Key point** -> Layout is triggered by geometry changes (width, height, font, etc.).
- **Key point** -> It can be expensive across large DOMs.
- **Gotcha** -> Reading layout after writes can force a synchronous reflow.

Example:
```js
el.style.width = "200px";
const w = el.offsetWidth; // forces layout
```
