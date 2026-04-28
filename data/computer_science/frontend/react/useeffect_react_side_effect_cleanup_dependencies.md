### React `useEffect` — Side Effects, Cleanup, Dependencies

**Definition:** **`useEffect`** runs side effects **after the browser paints** the rendered output. Use it to subscribe to external systems, fetch data, set up timers, or sync with non-React code. Always return a cleanup function for anything that subscribes or holds resources.

**Anatomy:**

```jsx
useEffect(() => {
  // 1. Setup — runs after paint, on every dep change
  const id = setInterval(refresh, 1000);

  // 2. Cleanup — runs before next setup AND on unmount
  return () => clearInterval(id);
}, [refresh]); // 3. Dependencies
```

| Slot | Purpose |
|---|---|
| Setup function | Imperative work — subscribe / fetch / mutate non-React |
| Cleanup function | Tear down what setup created |
| Deps array | When to re-run |

**Dependency forms:**

| Form | Behavior |
|---|---|
| `[]` | Run once on mount, cleanup on unmount |
| `[a, b]` | Run when `a` or `b` change (referentially) |
| (omitted) | Run after every render |
| Missing reactive value | Stale closure |

**The render → commit → effect cycle:**

```
   Render ─► Commit (DOM mutation) ─► Paint ─► Effect ─► (next render?)
                                              │
                                              └─► Cleanup runs at start of next cycle
```

| Phase | What |
|---|---|
| Render | JSX returned (pure) |
| Commit | DOM updated |
| Paint | Browser shows pixels |
| Effect | After paint, async |
| Cleanup | Before next effect / on unmount |

**Common patterns:**

```jsx
// 1. Fetch with cancellation guard
useEffect(() => {
  let cancelled = false;
  fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(data => { if (!cancelled) setUser(data); });
  return () => { cancelled = true; };
}, [id]);

// 2. Event listener
useEffect(() => {
  const handler = e => setPos({ x: e.clientX, y: e.clientY });
  window.addEventListener("mousemove", handler);
  return () => window.removeEventListener("mousemove", handler);
}, []);

// 3. Timer
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, [tick]);

// 4. Subscription
useEffect(() => {
  const unsub = store.subscribe(setSnapshot);
  return unsub;
}, []);

// 5. AbortController (modern)
useEffect(() => {
  const ctrl = new AbortController();
  fetch(url, { signal: ctrl.signal })
    .then(r => r.json())
    .then(setData)
    .catch(e => { if (e.name !== "AbortError") setError(e); });
  return () => ctrl.abort();
}, [url]);
```

**Cleanup — the most important habit:**

| If setup does | Cleanup must |
|---|---|
| `setTimeout` / `setInterval` | `clearTimeout` / `clearInterval` |
| `addEventListener` | `removeEventListener` |
| Open WebSocket / EventSource | Close it |
| Subscribe to store | Unsubscribe |
| Start animation | Cancel it |
| Lock scroll | Restore |
| Mutate global / DOM | Restore |
| Start a fetch | Cancel via AbortController |

**Strict mode (React 18+) — runs effects twice in dev:**

| Property | Detail |
|---|---|
| Why | Surface missing cleanup early |
| Effect runs: setup → cleanup → setup | All in dev |
| Production | Runs once normally |
| Implication | Your effect must be **idempotent** (safe to run twice) |
| Bad effects revealed | Sockets opened twice, fetches duplicated, leaks |

**Stale closure trap:**

```jsx
// ❌ BAD — count is captured once, always 0 when interval fires
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(id);
  }, []);   // missing dep `count`
}

// ✅ FIX 1 — updater function
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);

// ✅ FIX 2 — list count as dep
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, [count]);   // re-creates interval each tick (slower but correct)
```

| Pattern | Use |
|---|---|
| Updater function | Don't depend on closed-over value |
| List dep | Re-run effect when value changes |
| `useRef` for "latest value" | Avoid re-running but use latest |

**`useRef` for "latest value" pattern:**

```jsx
function Timer({ onTick }) {
  const callbackRef = useRef(onTick);
  useEffect(() => { callbackRef.current = onTick; }, [onTick]);

  useEffect(() => {
    const id = setInterval(() => callbackRef.current(), 1000);
    return () => clearInterval(id);
  }, []);   // setup once; callback always latest
}
```

**Dependency rules:**

| Rule | Detail |
|---|---|
| Include every reactive value used inside | Linter enforces |
| Don't include refs | `ref.current` isn't reactive |
| Constants outside | Move out of component if possible |
| Functions defined inside component | Wrap with `useCallback` if you need them stable |
| `setX` setters from `useState` | Stable, no need to list |
| `dispatch` from `useReducer` | Stable |

**When NOT to use `useEffect`:**

| Misuse | Right answer |
|---|---|
| Derive value from props | Compute during render |
| Reset state when prop changes | Use `key` to remount |
| Update state from another state | Compute during render |
| Adjust state in response to event | Do it in the handler |
| Initialize state with prop | Pass prop to `useState` |
| Cache expensive calc | `useMemo` |
| Subscribe to external store | `useSyncExternalStore` |

> The "You Might Not Need an Effect" guide is the most important React doc.

**Effect order:**

| Phase | Order |
|---|---|
| Cleanup of effects from previous render | First — child to parent (deepest first) |
| New effects | After — parent to child |
| Layout effects | Synchronous, before paint |
| Effects | Async, after paint |

**Variants:**

| Hook | When it runs |
|---|---|
| `useEffect` | After paint (default) |
| `useLayoutEffect` | Synchronously before paint |
| `useInsertionEffect` | Before any layout — for CSS-in-JS only |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Effect to sync state from props | Compute during render |
| Effect chains (effect A sets state → triggers effect B) | Render → effect → render → effect cascade |
| Empty dep array with closed-over state | Stale closures |
| Forgetting cleanup | Memory leaks, double subscriptions in StrictMode |
| Heavy work in effect | Frame drop |
| Conditional `useEffect` | Hook order broken |
| `useEffect` for measurement → setState | Use `useLayoutEffect` |
| `useEffect` for initial computation | Compute in `useState` lazy init |

**Decision matrix — pick the right tool:**

| Need | Tool |
|---|---|
| Sync with browser API (events, timer, observer) | `useEffect` |
| Fetch data | `useEffect` (or library: SWR / React Query) |
| Read DOM measurement → set state | `useLayoutEffect` |
| Subscribe to external store | `useSyncExternalStore` |
| CSS-in-JS injection | `useInsertionEffect` |
| Derived value | Compute in render / `useMemo` |
| Reset state on prop change | `key` prop |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Missing cleanup | Multiplying subscriptions on remount |
| Effect that sets state unconditionally | Render loop |
| Including unstable function as dep without useCallback | Re-runs constantly |
| Using setInterval without `useRef` for callback | Stale callback |
| Not handling cancelled fetch | Updates unmounted component (warning) |
| `useEffect` called from non-component | Hook rules violated |
| Doing fetches in render | Renders multiple times → multiple fetches |
| Cleanup that does heavy work | Slows tear-down |

**Cross-references:**

- useEffect vs useLayoutEffect: [useeffect_vs_uselayouteffect.md](../common_theory_prompts/useeffect_vs_uselayouteffect.md)
- Hooks (overall): [hooks_*.md](hooks_react_usestate_useeffect_custom_lifecycle.md)
- Props vs state: [props_vs_state_*.md](props_vs_state_react_readonly_mutable_rerender.md)
- Async/await: [async_await_*.md](../javascript_core_theory/async_await_promise_try_catch.md)

**Rule of thumb:** **`useEffect` is for syncing with non-React systems** — events, timers, fetches, subscriptions. **Always return a cleanup function** when you subscribe or hold a resource. Use **updater functions** or `useRef` to avoid stale closures. **You probably don't need an effect** for derived values, initial computation, or syncing state from props — compute during render or use `key` instead. **Strict mode runs effects twice** in dev — design them to be idempotent.
