### Specificity

Specificity decides which rule wins when multiple selectors apply.

- **Key point** -> ID selectors outweigh classes.
- **Key point** -> Later rules win when specificity is equal.
- **Gotcha** -> Overly specific CSS is brittle.

Example:
```css
.card .title { color: #222; }
#hero .title { color: #000; }
```
