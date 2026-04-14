### Flexbox

Flexbox lays out items in one dimension with alignment and spacing controls.

- **Key point** -> `justify-content` controls main axis alignment.
- **Key point** -> `align-items` controls cross axis alignment.
- **Gotcha** -> Flex items can shrink by default (`flex-shrink: 1`).

Example:
```css
.row { display: flex; gap: 12px; justify-content: space-between; }
```
