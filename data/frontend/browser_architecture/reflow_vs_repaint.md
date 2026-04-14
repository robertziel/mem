### Reflow vs Repaint

Reflow (layout) recalculates geometry; repaint redraws pixels without changing layout.

- **Key point** -> Width/height changes cause reflow.
- **Key point** -> Color changes cause repaint only.
- **Gotcha** -> Reflow often triggers repaint, so avoid layout thrash.

Example:
```js
el.style.width = "400px";  // reflow + repaint
el.style.color = "red";    // repaint only
```
