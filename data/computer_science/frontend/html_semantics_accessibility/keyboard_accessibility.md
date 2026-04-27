### Keyboard Accessibility

Keyboard accessibility ensures all actions are possible without a mouse.

- **Key point** -> Tab order should be logical.
- **Key point** -> Visible focus styles are essential.
- **Gotcha** -> `tabindex="-1"` removes element from tab flow.

Example:
```css
:focus-visible { outline: 2px solid #2563eb; }
```
