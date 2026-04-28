### Browser Rendering Pipeline — DOM → CSSOM → Layout → Paint → Composite

**Definition:** the **render pipeline** is the sequence the browser runs every time the page or its visuals change: parse HTML to DOM, parse CSS to CSSOM, build render tree, **layout**, **paint**, **composite**. Knowing what triggers each stage tells you why some animations are smooth and others jank.

**The full pipeline:**

```
HTML bytes ──► Tokens ──► DOM tree ──┐
                                      ├──► Render tree ──► Layout ──► Paint ──► Composite ──► Display
CSS bytes ──► Tokens ──► CSSOM ──────┘
```

| Stage | Input | Output | Cost |
|---|---|---|---|
| **Parse HTML** | Bytes | DOM tree | Fast unless huge |
| **Parse CSS** | Bytes | CSSOM | Fast |
| **Render tree** | DOM ∩ CSSOM (visible) | Tree of visible boxes | Cheap |
| **Layout** | Render tree + viewport | Geometry (x, y, w, h) | Expensive on big trees |
| **Paint** | Layout boxes | Painted layer bitmaps | Often expensive |
| **Composite** | Painted layers | Final frame | Cheap (often GPU) |

**What triggers what:**

| Change | Triggers |
|---|---|
| `width`, `height`, `padding`, `top`, `left`, `display` | **Layout → Paint → Composite** |
| `color`, `background`, `box-shadow`, `border-radius` | **Paint → Composite** |
| `transform`, `opacity`, `filter` | **Composite only** |
| Adding / removing element | Layout → Paint → Composite |
| `className` toggle | Style recalc → maybe layout / paint |
| `display: none` ↔ `block` | Full pipeline |
| `visibility: hidden` ↔ `visible` | Paint only |
| Scroll | Paint or composite (depending) |

**The 16ms budget (60fps):**

```
0ms                     16ms
│  JS  │ Style │ Layout │ Paint │ Composite │
                                            ▲
                                         next frame
```

| Phase | Typical cost |
|---|---|
| JS | 1–10 ms (bad if more) |
| Style recalc | <1 ms (small DOM) |
| Layout | 0–10 ms (bigger DOM = worse) |
| Paint | varies — depends on layers + content |
| Composite | <1 ms typically |

> Frame budget is **16ms for 60fps, 8ms for 120fps.** Animation jank means you blew it.

**Critical rendering path — the first paint:**

```
1. HTML loads + parses (incremental; can't fully build DOM until scripts complete)
2. CSS loads + parses (blocks rendering until done)
3. Render tree built
4. First layout
5. First paint
6. JS runs, may mutate DOM
7. Re-layout / repaint as needed
```

| Optimization | Effect |
|---|---|
| `<link rel="preload">` critical CSS / fonts | Faster first paint |
| Inline critical CSS | Avoid roundtrip |
| `defer` / `async` script | Don't block parser |
| Server-side rendering | First paint doesn't wait for JS |
| Resource hints (`preconnect`, `dns-prefetch`) | Faster connection |
| Minified CSS / HTML | Smaller bytes |

**Render-blocking resources:**

| Resource | Render-blocking? |
|---|---|
| `<link rel="stylesheet">` | Yes |
| `<script>` (default) | Yes |
| `<script defer>` | No (runs in order, after parse) |
| `<script async>` | No (runs whenever loaded) |
| `<script type="module">` | Defers by default |
| `<img>` | No (lazy by default for off-screen) |
| Inline `<style>` | Yes (parse & apply) |

**Layout thrashing — the big perf bug:**

```javascript
// ❌ BAD: forces sync layout each iteration
items.forEach(el => {
  el.style.width = "200px";        // invalidates layout
  el.style.height = el.offsetHeight + "px";  // forces layout NOW
});

// ✅ GOOD: batch reads, then batch writes
const heights = items.map(el => el.offsetHeight);   // one layout
items.forEach((el, i) => {
  el.style.width = "200px";
  el.style.height = heights[i] + "px";              // no forced layout
});
```

| Read property (forces layout) | Write (invalidates layout) |
|---|---|
| `offsetWidth/Height/Top/Left` | `style.width / height / top / left` |
| `clientWidth/Height/Top/Left` | `className` |
| `scrollWidth/Height/Top/Left` | `innerHTML` |
| `getBoundingClientRect()` | DOM insert / remove |
| `getComputedStyle()` | Style toggle |

**Promoting a layer (composite-only path):**

| Trigger | Detail |
|---|---|
| `will-change: transform, opacity` | Modern hint |
| `transform: translateZ(0)` | Old hack |
| `<video>`, `<canvas>`, `<iframe>` | Auto |
| 3D transforms | Auto |
| `position: fixed/sticky` | Often |
| `backdrop-filter` | Often |

> Animate `transform` and `opacity` only for jank-free 60fps animations.

**Paint complexity — what's expensive:**

| Property | Paint cost |
|---|---|
| Solid color | Cheap |
| Gradient | Medium |
| `box-shadow` | Often expensive |
| `border-radius` (large) | Expensive on Safari |
| Text | Medium (cached glyphs) |
| `filter: blur(...)` | Expensive (GPU) |
| `clip-path` | Cheap on simple shapes |

**Critical-path DevTools commands:**

| Tool | Use |
|---|---|
| **Performance** tab | Record interaction, see frame breakdown |
| **Rendering → Paint flashing** | Shows what repaints |
| **Rendering → Layer borders** | Shows layers |
| **Lighthouse** | Lighthouse audit + suggestions |
| **`performance.measure()`** | Custom marks |
| **Coverage** tab | Unused CSS / JS |

**Causes of "first paint is slow":**

| Cause | Fix |
|---|---|
| Render-blocking CSS | Inline critical / defer rest |
| Render-blocking sync scripts | `defer` / `async` / module |
| Web fonts blocking text | `font-display: swap` |
| Huge DOM (10K+ nodes) | Virtualize / split |
| Big main-thread JS task | Code split / lazy load |
| Unminified resources | Build pipeline |
| Many round-trips | HTTP/2, preconnect |

**Causes of "animation is janky":**

| Cause | Fix |
|---|---|
| Animating layout properties | Switch to transform/opacity |
| Long main-thread JS | Move to Web Worker / break up |
| Forced sync layout (thrashing) | Batch reads, then writes |
| Too many layers | Trim `will-change` |
| Heavy paint (huge box-shadow) | Simplify |
| `setTimeout` mismatch with frame | Use `requestAnimationFrame` |

**Order of execution (per frame):**

| Phase | Detail |
|---|---|
| Input events | `click`, `keydown`, etc. |
| `requestAnimationFrame` callbacks | Run before layout |
| Layout / paint / composite | Runs |
| `requestIdleCallback` | If idle time left |

**Modern containment APIs:**

| Property | Detail |
|---|---|
| `contain: layout` | Element layout independent of outside |
| `contain: paint` | Paint clipped to bounds |
| `contain: strict` | Layout + paint + size |
| `content-visibility: auto` | Skip rendering off-screen |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Animating `width` / `top` / `left` | Forces layout each frame |
| Big DOM tree | Slow style + layout |
| Many small DOM mutations | Multiple layouts |
| `:hover` on huge tree | Style recalc storm |
| `box-shadow` animation | Repaint every frame |
| Layout properties read after writes | Forced sync layout |
| `font-display: block` (default) | Invisible text until font loads |
| Render-blocking analytics scripts | Late first paint |

**Cross-references:**

- DOM tree fundamentals: [dom_*.md](dom_document_object_model_tree.md)
- Compositing + layers: [compositing_*.md](compositing_gpu_layers_will_change.md)
- Event loop ordering: [event_loop_*.md](../common_theory_prompts/event_loop_ordering.md)
- React render lifecycle: [react_render_*.md](../react/render_lifecycle_state_props.md)

**Rule of thumb:** **DOM + CSSOM → Render tree → Layout → Paint → Composite.** Each stage is more expensive than the next, and each invalidates everything below it. **Animate `transform` and `opacity` only**, **batch reads/writes** to avoid forced sync layout (thrashing), **defer non-critical CSS / JS** for first-paint speed. Use the **DevTools Performance tab** to see which stage is your bottleneck — guessing is rarely right.
