### BFC (Block Formatting Context)

A BFC is a layout context that isolates floats, margins, and positioning.

- **Key point** -> BFC can prevent margin collapse.
- **Key point** -> BFC contains floats so parents wrap them.
- **Gotcha** -> Creating too many BFCs can complicate layout.

Example:
```css
.container { overflow: auto; } /* creates BFC */
```
