### Rendering Pipeline

The browser pipeline is: parse HTML -> DOM, parse CSS -> CSSOM, build render tree, layout, paint, composite.

- **Key point** -> JS can block parsing and delay the pipeline.
- **Key point** -> Layout and paint are the most expensive stages.
- **Gotcha** -> Alternating DOM reads/writes causes layout thrashing.

Example:
```js
// Bad: alternating read/write
el.style.height = "200px";
const h = el.offsetHeight;
el.style.height = h + 10 + "px";
```
