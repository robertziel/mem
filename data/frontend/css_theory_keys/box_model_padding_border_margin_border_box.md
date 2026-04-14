### Box Model

Every element has content, padding, border, and margin.

- **Key point** -> `border-box` includes padding/border in declared width.
- **Key point** -> Margin is outside the border.
- **Gotcha** -> Default `content-box` can surprise width calculations.

Example:
```css
* { box-sizing: border-box; }
```
