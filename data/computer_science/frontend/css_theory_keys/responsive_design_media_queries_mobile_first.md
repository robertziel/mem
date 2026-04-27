### Responsive Design

Responsive design adapts layout to different screen sizes and devices.

- **Key point** -> Use fluid layouts (`%`, `fr`, `vw`) and media queries.
- **Key point** -> Prefer mobile-first CSS.
- **Gotcha** -> Fixed widths can break on small screens.

Example:
```css
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```
