### Browser Compositing — GPU Layers, `will-change`, `transform`

**Definition:** the **compositing** stage merges already-painted layers into the final on-screen frame, often on the GPU. **Promoting an element to its own layer** lets the browser animate `transform` / `opacity` without re-running layout or paint — the cheap path.

**The render pipeline (compositing's place):**

```
Style → Layout → Paint → Compositing → Display
                              ▲
                       (cheap if only this changes)
```

| Stage | What changes triggers it |
|---|---|
| **Style** | CSS rule changes |
| **Layout** | `width`, `height`, `top`, `left`, `display` |
| **Paint** | `color`, `background`, `box-shadow` (often) |
| **Composite** | `transform`, `opacity`, `filter` (only) |

**Compositor-only properties (the cheap ones):**

| Property | Cost |
|---|---|
| `transform: translate / scale / rotate / skew` | **Composite only** |
| `opacity` | **Composite only** |
| `filter` (with GPU acceleration) | Composite only |
| `will-change: transform / opacity` | Hint for promotion |
| `clip-path` | Often composite-only |

**Layer promotion — what triggers it:**

| Trigger | Property |
|---|---|
| `will-change: transform` | Explicit hint |
| `transform: translateZ(0)` / `translate3d(0,0,0)` | The classic "GPU layer hack" |
| `position: fixed` / `sticky` | Often promoted |
| `<video>`, `<canvas>` (GPU-backed) | Always |
| 3D transforms | Always |
| `iframe`, plugins | Sometimes |
| `backdrop-filter` | Often |
| Animation on transform / opacity | Browser may auto-promote |

**`will-change` — the official hint:**

```css
.modal {
  will-change: transform, opacity;
}

.modal--entering {
  transform: translateY(0);
  opacity: 1;
  transition: transform 200ms, opacity 200ms;
}
```

| Property | Detail |
|---|---|
| Tells browser "this will animate" | Pre-allocate layer |
| Apply BEFORE the animation starts | Not while it's running |
| Remove AFTER it stops | Layers cost memory |
| Multiple values | `will-change: transform, opacity` |
| Don't apply to many elements | Defeats the point |

**Why layers help — the dirty rect math:**

| Without layer | With layer |
|---|---|
| Element transforms → repaint surrounding | Transform on GPU; no repaint |
| Each frame: layout + paint + composite | Each frame: composite only |
| 16ms budget often blown | Easy 60fps |

**The GPU vs CPU split:**

```
CPU (main thread):                   GPU (compositor):
- JS                                  - Layer compositing
- Style recalc                        - Transform / opacity matrices
- Layout                              - Hardware-accelerated filters
- Paint (sometimes raster on GPU)
                                      Off-main-thread → smooth animation
                                      even if main thread is busy
```

| Property | Detail |
|---|---|
| Main thread = JS / DOM / Layout / Paint | Easily blocked |
| Compositor thread = layer assembly | Rarely blocked |
| Animations on `transform` / `opacity` keep running | Even with main-thread jank |

**Decision matrix — picking the cheap path:**

| Need | Use |
|---|---|
| Animate position | `transform: translate(...)` (NOT `top`/`left`) |
| Animate size | `transform: scale(...)` (NOT `width`/`height`) |
| Animate fade | `opacity` |
| Animate rotation | `transform: rotate(...)` |
| Animate color | Repaint required (yellow flag) |
| Animate `box-shadow` | Repaint required (often expensive) |
| Animate `width`/`height` | **Layout** required (worst) |

**Common layer-related pitfalls:**

| Pitfall | Effect |
|---|---|
| `will-change` on every element | Memory blowup; defeats purpose |
| Permanent `will-change` (set, never removed) | Layer kept forever, wastes RAM |
| Animating `top`/`left` instead of `transform` | Triggers layout every frame |
| Animating `width`/`height` instead of `transform: scale` | Layout every frame |
| `filter: blur(...)` animation on huge layer | GPU bound |
| Too many layers (100s) | Memory + composite cost |
| `translateZ(0)` everywhere | Old hack; prefer `will-change` |
| Forgetting to remove `will-change` post-animation | Long-lived layer |

**Diagnostic in DevTools:**

| Tool | Use |
|---|---|
| **Layers panel** (Chrome DevTools) | Shows all promoted layers |
| **Rendering** → **Layer borders** | Visual overlay |
| **Rendering** → **Paint flashing** | Highlights re-painted regions |
| **Performance recording** | See compositor vs main-thread time |
| **`element.computedStyleMap()`** | Inspect runtime promotions |

**Rules of thumb for performance:**

| Rule | Detail |
|---|---|
| **Animate only `transform` and `opacity`** | Composite-only |
| **Promote sparingly** | Few critical animated elements |
| **Use `will-change` not `translateZ(0)`** | Modern, expressive |
| **Remove `will-change` when done** | Reclaim memory |
| **Avoid animating layout properties** | Always slow |
| **Watch layer count in DevTools** | Track regressions |

**Containment + content-visibility (modern siblings):**

| Property | Detail |
|---|---|
| `contain: layout paint` | Hint browser the element is independent |
| `content-visibility: auto` | Skip rendering off-screen until needed |
| Both reduce work | Different mechanism than layer promotion |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Long-running animations on huge `<canvas>` | Texture upload bottleneck |
| Mixing `transform` + `top` in same animation | Layout triggers anyway |
| Using filters on full-screen elements | GPU bandwidth limits |
| Heavy `backdrop-filter` | Expensive on low-end devices |
| Rendering tons of small SVG elements | Per-element layer cost |
| Too eager `will-change` adoption | Memory leaks |

**Cross-references:**

- Render pipeline (DOM → CSSOM → Layout → Paint → Composite): [rendering_pipeline_*.md](rendering_pipeline_dom_cssom_layout_paint_composite.md)
- DOM tree basics: [dom_*.md](dom_document_object_model_tree.md)
- CSS animations vs transitions: [animations_vs_transitions_*.md](../css_theory_keys/animations_vs_transitions_keyframes_css.md)
- Browser performance overview: [browser_performance_*.md](browser_performance_critical_rendering_path.md)

**Rule of thumb:** **Animate `transform` and `opacity` only — they're composite-only.** Use **`will-change: transform, opacity`** to hint promotion before the animation, **remove it after**. Animating `width`/`height`/`top`/`left` triggers layout every frame and kills 60fps. Layers cost memory — promote only what's actually animated and only while it's animating. Use the **DevTools Layers panel** to verify.
