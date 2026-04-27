### CSSOM

CSSOM is the in-memory model of CSS rules the browser builds from stylesheets.

- **Key point** -> The render tree is created from DOM + CSSOM.
- **Key point** -> CSS blocks rendering because CSSOM must be built first.
- **Gotcha** -> Complex selectors increase style calculation cost.

Example:
```css
/* Prefer simple selectors for faster matching */
.button.primary { color: white; }
```
