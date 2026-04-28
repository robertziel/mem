### CSS — Transitions vs Animations vs Keyframes

**Definition:** **Transitions** interpolate a property between two states (triggered by something — hover, class change). **Animations** run a `@keyframes` sequence on their own — multiple steps, can loop. Both ride the browser render pipeline; both perform best on **transform** + **opacity**.

**Core comparison:**

| Property | **Transition** | **Animation (`@keyframes`)** |
|---|---|---|
| Trigger | State change (hover, class, attribute) | Auto-start (or play-state) |
| Steps | Two states (from current → to target) | Many keyframes |
| Loop | No (one-way) | Yes (`infinite` or count) |
| Reversible | Yes (state reverts) | Yes (`alternate` direction) |
| Pause | Limited | `animation-play-state: paused` |
| Defining | `transition: prop dur ease` | `@keyframes name { ... }` |
| Use case | Simple A→B reactions | Complex, repeating, multi-step |

**Transition example:**

```css
.button {
  background: blue;
  transform: scale(1);
  transition: transform 150ms ease, background 150ms ease;
}

.button:hover {
  background: darkblue;
  transform: scale(1.05);
}
```

| Property | Detail |
|---|---|
| `transition: <prop> <duration> <timing>` | Shorthand |
| Multiple props | Comma-separate |
| `all` | Animates everything (lazy; usually bad idea) |
| Triggers | Hover, focus, class toggle, attribute change |

**Animation / `@keyframes` example:**

```css
@keyframes pulse {
  0%   { transform: scale(1);    opacity: 1; }
  50%  { transform: scale(1.05); opacity: 0.7; }
  100% { transform: scale(1);    opacity: 1; }
}

.heart {
  animation: pulse 1s ease-in-out infinite;
}
```

| Property | Default | Detail |
|---|---|---|
| `animation-name` | none | The `@keyframes` block |
| `animation-duration` | 0s | How long one cycle |
| `animation-timing-function` | ease | `linear`, `ease-in-out`, `cubic-bezier(...)` |
| `animation-iteration-count` | 1 | Number or `infinite` |
| `animation-direction` | normal | `reverse`, `alternate`, `alternate-reverse` |
| `animation-fill-mode` | none | `forwards` (keep end), `backwards` (apply start before delay), `both` |
| `animation-play-state` | running | `paused` |
| `animation-delay` | 0 | Wait before starting |

**Shorthand:**

```css
.fade-in {
  animation: fadeIn 300ms ease-out 100ms 1 normal forwards;
  /*           ^^   ^^^^   ^^^^^^^ ^^^^ ^ ^^^^^^ ^^^^^^^^
              name  dur    timing  delay count direction fill-mode */
}
```

**Timing functions visualized:**

| Function | Curve |
|---|---|
| `linear` | Steady |
| `ease` | Slow-fast-slow (default) |
| `ease-in` | Slow start |
| `ease-out` | Slow end |
| `ease-in-out` | Slow ends, fast middle |
| `step-start` | Jump immediately |
| `step-end` | Jump at end |
| `steps(N, end)` | Discrete steps |
| `cubic-bezier(x1,y1,x2,y2)` | Custom |

**Animatable properties — the cheap path:**

| Property | Cost |
|---|---|
| `transform` (translate, scale, rotate) | **Composite only — best** |
| `opacity` | **Composite only — best** |
| `filter` (with GPU) | Composite or paint |
| `color`, `background-color` | Paint |
| `box-shadow` | Often paint, can be expensive |
| `border-radius` (large) | Sometimes paint |
| `width`, `height`, `padding`, `margin` | **Layout — bad** |
| `top`, `left`, `right`, `bottom` | **Layout — bad** |

> **Animate `transform` + `opacity` only** for 60fps. Everything else triggers layout or paint.

**Common patterns:**

| Pattern | Implementation |
|---|---|
| Fade in | `transition: opacity` (0 → 1) |
| Slide in from right | `transform: translateX(100%) → translateX(0)` |
| Pop on click | `:active { transform: scale(0.97) }` |
| Skeleton shimmer | `@keyframes` linear-gradient position |
| Spinner | `@keyframes rotate { from { transform: rotate(0) } to { transform: rotate(360deg) } }` + `infinite linear` |
| Pulse | `@keyframes` scaling 1 → 1.05 → 1 alternate |
| Reveal on scroll | `IntersectionObserver` toggles class with transition |

**Triggering an animation from JavaScript:**

```javascript
// CSS-driven via class toggle (preferred)
element.classList.add("animate-slide-in");

// Imperative (Web Animations API, modern)
element.animate(
  [{ transform: "translateY(20px)", opacity: 0 },
   { transform: "translateY(0)",     opacity: 1 }],
  { duration: 250, easing: "ease-out", fill: "forwards" }
);

// Listen for completion
element.addEventListener("transitionend", () => { ... }, { once: true });
element.addEventListener("animationend", () => { ... }, { once: true });
```

| API | Use |
|---|---|
| Class toggle + CSS | Most cases — declarative |
| **Web Animations API** | Imperative + composable, modern |
| `transitionend` | One-shot completion |
| `animationend` / `animationiteration` | Per-iteration |
| `@starting-style` (CSS 2024+) | Animate from initial state on mount |

**`prefers-reduced-motion` — accessibility:**

```css
@media (prefers-reduced-motion: reduce) {
  .heart { animation: none; }
  .fade-in { transition: none; }
}
```

| Why | Detail |
|---|---|
| Vestibular disorders | Motion can cause nausea |
| Browser preference | OS-level setting |
| Animation off, content visible | Don't hide content; just remove motion |
| Test it | Toggle in DevTools (Rendering > Emulate CSS media) |

**FLIP technique (smooth list reordering):**

| Step | Detail |
|---|---|
| **F**irst | Measure starting position |
| **L**ast | After the layout change, measure new position |
| **I**nvert | Apply `transform` to put element where it was |
| **P**lay | Animate `transform` back to 0 |

**`animation-fill-mode` decoded:**

| Value | Effect before delay | Effect after end |
|---|---|---|
| `none` (default) | None | Reverts to base style |
| `forwards` | None | Keeps last keyframe |
| `backwards` | Applies first keyframe | Reverts to base |
| `both` | Applies first | Keeps last |

**Pseudo-element animation (small detail, big effect):**

```css
.button::after {
  content: "";
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0;
  transition: opacity 150ms;
}
.button:hover::after { opacity: 0.1; }
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `transition: all` | Animates everything; bad perf |
| Animating `width` / `height` | Layout per frame |
| Animating `display: none ↔ block` | Display isn't animatable |
| Animating `auto` heights | Hard — use `max-height` or `transform: scaleY` |
| Forgetting `forwards` | Element snaps back to start |
| Heavy `box-shadow` animation | Repaint per frame |
| `animation` and `transition` on same property | Animation wins while running |
| Ignoring `prefers-reduced-motion` | Accessibility violation |
| Long animations on every element | Drains battery |
| Missing initial `transition: none` on mount | Animates initial render |

**Cross-references:**

- Compositing + GPU layers: [compositing_*.md](../browser_architecture/compositing_gpu_layers_will_change.md)
- Render pipeline: [rendering_pipeline_*.md](../browser_architecture/rendering_pipeline_dom_cssom_layout_paint_composite.md)
- React useEffect (mounting transitions): [useeffect_*.md](../react/useeffect_react_side_effect_cleanup_dependencies.md)

**Rule of thumb:** **Transitions = state-change interpolation, animations = keyframe sequences.** Animate **`transform`** and **`opacity`** only — they're composite-only, the rest triggers layout / paint. Use **class toggle + CSS** for most cases; reach for the **Web Animations API** when you need imperative control. Always honor **`prefers-reduced-motion`** — at least disable looping or auto-playing motion.
