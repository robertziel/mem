### React — `useEffect` vs `useLayoutEffect`

**Definition:** both run side effects after a render; the difference is **when** relative to the browser paint. **`useEffect`** runs **after paint** (async); **`useLayoutEffect`** runs **synchronously before paint** (blocks the screen). Use the layout one only when you must read or mutate the DOM before the user sees the frame.

**Side-by-side:**

| Property | **`useEffect`** | **`useLayoutEffect`** |
|---|---|---|
| Timing | **After** browser paint | **Before** browser paint (sync) |
| Blocks paint? | No | **Yes** |
| Use for | Most side effects | DOM measurement → DOM mutation |
| Risk | UI flash if you mutate after | Jank if effect is slow |
| SSR / Next.js | Works | **Warns** server-side; runs only client |
| Default choice | **Yes** — use this 95% of the time | Reserve for measure-then-mutate |

**The render cycle:**

```
   Render ─► Commit ─► useLayoutEffect ─► Paint ─► useEffect
                       (sync, blocks)              (async, after frame)
```

| Phase | What runs |
|---|---|
| Render | Function returns JSX |
| Commit | React applies DOM changes |
| `useLayoutEffect` | Sync — read measured DOM, optionally mutate |
| Paint | Browser draws frame |
| `useEffect` | Async — fetch, subscribe, log |

**When `useLayoutEffect` is the right choice:**

| Scenario | Why |
|---|---|
| Measure DOM, then **set state that affects layout** | Avoids one-frame flash |
| Position a tooltip relative to its trigger | Need final position before paint |
| Lock scroll position before rendering modal | Avoids visible scroll jump |
| Synchronously focus an input | Visible focus ring without lag |
| Animate from a measured starting position (FLIP) | Need starting transform before paint |
| Reading `getBoundingClientRect` and mutating | Avoid layout thrash + flash |

**When `useEffect` is the right choice:**

| Scenario | Why |
|---|---|
| Data fetching (`fetch`, `useQuery`) | Async, no DOM impact |
| WebSocket subscriptions | After paint is fine |
| Logging / analytics | After paint is fine |
| Setting up timers / intervals | Async |
| Resize / scroll listeners | Async |
| Non-visual side effects | Default |

**The flicker problem `useLayoutEffect` fixes:**

```jsx
// ❌ Flickers — user sees default state before measurement applies
function Tooltip() {
  const ref = useRef();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom });
  }, []);

  return <div ref={ref} style={position}>...</div>;
  // First paint: position {0, 0} → flicker
  // Second paint: correct position
}

// ✅ No flicker — measurement runs before paint
function Tooltip() {
  const ref = useRef();
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom });
  }, []);

  return <div ref={ref} style={position}>...</div>;
}
```

**SSR caveat:**

```jsx
// useLayoutEffect logs a warning on the server (no DOM)
// Workaround pattern:
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
```

| Problem | Fix |
|---|---|
| `useLayoutEffect` warns "no-op on server" | Branch on `typeof window` |
| Or refactor to `useEffect` | If timing isn't critical |
| Or skip rendering until mounted | `if (!mounted) return null` |

**Cleanup function fires the same way:**

```jsx
useEffect(() => {
  const handler = e => console.log(e);
  window.addEventListener("scroll", handler);
  return () => window.removeEventListener("scroll", handler);  // cleanup
}, []);
```

| Cleanup runs | Detail |
|---|---|
| Before next effect run | Tracks dependency change |
| Before unmount | Tear down |
| For both `useEffect` and `useLayoutEffect` | Same semantics |

**Dependency array — the same rules apply:**

| Form | Effect |
|---|---|
| `useEffect(fn, [])` | Run once after mount |
| `useEffect(fn, [a, b])` | Run when `a` or `b` change |
| `useEffect(fn)` (no deps) | Run after every render |
| Empty deps + closing over state | Stale-closure bug |

**Common patterns:**

```jsx
// FLIP animation — measure → set transform → animate to 0
useLayoutEffect(() => {
  const before = ref.current.getBoundingClientRect();
  flushSync(() => setOpen(true));
  const after = ref.current.getBoundingClientRect();

  ref.current.animate([
    { transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` },
    { transform: "none" }
  ], 200);
}, [open]);
```

**Decision matrix:**

| Need | Use |
|---|---|
| Fetch data | `useEffect` |
| Subscribe to events | `useEffect` |
| Measure DOM and read | Either (read inside) |
| Measure → setState that affects size | **`useLayoutEffect`** |
| Position floating UI | **`useLayoutEffect`** |
| Mutate DOM imperatively for animation start | **`useLayoutEffect`** |
| Long-running computation | Neither — `useMemo` or `useCallback` |
| Subscribe to external store | **`useSyncExternalStore`** |

**Performance considerations:**

| Property | Detail |
|---|---|
| `useLayoutEffect` runs on main thread before paint | Slow effect = janky frame |
| Heavy work in `useLayoutEffect` | User sees frozen UI |
| Stack of layout effects | Each runs in commit order |
| `useEffect` is fire-and-forget | Won't block paint |
| Deferring with `useDeferredValue` / `useTransition` | Push expensive work to lower priority |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Defaulting to `useLayoutEffect` for everything | Slower paint times |
| `useEffect` for measurement + state | Visible flicker |
| Forgetting cleanup function | Memory leak / stale subscriptions |
| Deps array missing values | Stale closures |
| `useLayoutEffect` on server (Next.js) | Warning log |
| Heavy work in `useLayoutEffect` | Frame drop |
| Recursive setState in either effect | Render loop |
| Using effects to derive state | Use `useMemo` or compute in render |

**Pre-effect alternatives:**

| Alternative | Use |
|---|---|
| `useMemo(() => compute(deps), [deps])` | Derived value from props/state |
| `useState` initial value with function | Lazy initial state |
| Compute during render | Often the right answer |
| `useSyncExternalStore` | External subscriptions (Redux, Zustand) |
| `useImperativeHandle` | Expose imperative methods to parent |

**Cross-references:**

- React useEffect deep dive: [useeffect_*.md](../react/useeffect_react_side_effect_cleanup_dependencies.md)
- React render lifecycle: [render_lifecycle_*.md](../react/render_lifecycle_state_props.md)
- DOM tree + measurement: [dom_*.md](../browser_architecture/dom_document_object_model_tree.md)
- Render pipeline: [rendering_pipeline_*.md](../browser_architecture/rendering_pipeline_dom_cssom_layout_paint_composite.md)

**Rule of thumb:** **Default to `useEffect`. Reach for `useLayoutEffect` only when you must read or mutate the DOM synchronously before paint** — typical case is measuring an element and setting state that affects its layout, where `useEffect` would cause a one-frame flicker. **Heavy work** in `useLayoutEffect` causes jank — keep it short. In SSR, branch with `useIsomorphicLayoutEffect` or move to `useEffect`.
