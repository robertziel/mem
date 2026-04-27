### Animations vs Transitions

Transitions interpolate between two states; animations use keyframes over time.

- **Key point** -> Transitions need a trigger (state change).
- **Key point** -> Animations can loop and define multiple keyframes.
- **Gotcha** -> Animating layout properties can cause reflow.

Example:
```css
.box { transition: transform 200ms ease; }
.box:hover { transform: scale(1.05); }

@keyframes pulse { 0%{opacity:.6} 100%{opacity:1} }
```
