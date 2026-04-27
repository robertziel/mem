### Browser Rendering Pipeline (Prompt)

A one-glance recap: HTML -> DOM, CSS -> CSSOM, render tree, layout, paint, compositing.

- **Key point** -> Layout thrash happens when reads/writes are interleaved.
- **Key point** -> JS and CSS can block early rendering.
- **Gotcha** -> Large DOM and heavy CSS increase style/layout cost.

Example answer snippet:
```text
Parse HTML to DOM, parse CSS to CSSOM, merge to render tree, compute layout, paint pixels, then composite layers.
```
