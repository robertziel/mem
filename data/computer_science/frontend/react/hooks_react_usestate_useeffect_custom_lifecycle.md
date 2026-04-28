### React Hooks — `useState`, `useEffect`, Custom, Lifecycle

**Definition:** **Hooks** let function components use state, side effects, context, refs, and shared logic — replacing class lifecycle methods. The contract: **call hooks at the top level, in the same order, only inside React functions.**

**The Rules of Hooks (only two):**

| Rule | Detail |
|---|---|
| **Top level only** | Not inside loops, conditions, or nested functions |
| **From React functions only** | Components or other custom hooks |

> Lint rule: `eslint-plugin-react-hooks`. Don't fight it.

**Why the order matters:**

```jsx
// React identifies hooks by call order, not by name
function Counter() {
  const [count, setCount] = useState(0);     // 1st hook
  const [name, setName]   = useState("");    // 2nd hook
  useEffect(() => { ... }, []);              // 3rd hook
}
```

> If you `if (cond) useState()`, the order changes between renders → React mismatches state slots → bugs.

**Built-in hooks — by category:**

| Category | Hooks |
|---|---|
| **State** | `useState`, `useReducer` |
| **Effects** | `useEffect`, `useLayoutEffect`, `useInsertionEffect` |
| **Performance** | `useMemo`, `useCallback`, `useTransition`, `useDeferredValue` |
| **Refs** | `useRef`, `useImperativeHandle` |
| **Context** | `useContext` |
| **Identity / debug** | `useId`, `useDebugValue` |
| **External stores** | `useSyncExternalStore` |
| **React 19+** | `use()` (read promise / context conditionally) |

**`useState` essentials:**

```jsx
const [count, setCount] = useState(0);
const [user, setUser]   = useState(() => loadFromLocalStorage());  // lazy init

setCount(count + 1);                  // direct
setCount(c => c + 1);                 // updater (use when based on prev)
setUser({ ...user, name: "Alice" });  // immutable update
```

| Pattern | Detail |
|---|---|
| Lazy initial value | `useState(() => expensive())` runs once |
| Updater function | Always pass when next depends on prev |
| Object/array updates | Spread, don't mutate |
| Same value as before | Bails out, skips re-render |

**`useEffect` essentials:**

```jsx
useEffect(() => {
  const id = setInterval(refresh, 1000);
  return () => clearInterval(id);   // cleanup
}, [dep1, dep2]);
```

| Form | Behavior |
|---|---|
| `useEffect(fn, [])` | Once on mount, cleanup on unmount |
| `useEffect(fn, [a, b])` | Run when `a` or `b` changes (referentially) |
| `useEffect(fn)` | After every render |
| Return function | Cleanup before next run + on unmount |

**Lifecycle mapping (class → hooks):**

| Class lifecycle | Hooks equivalent |
|---|---|
| `componentDidMount` | `useEffect(() => { ... }, [])` |
| `componentDidUpdate` | `useEffect(() => { ... }, [deps])` |
| `componentWillUnmount` | Return function from `useEffect` |
| `getDerivedStateFromProps` | Compute during render or `useMemo` |
| `shouldComponentUpdate` | `React.memo` + `useMemo` / `useCallback` |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` |
| `componentDidCatch` | Class component (Error Boundary) — no hook yet |

**`useReducer` — for complex state transitions:**

```jsx
function reducer(state, action) {
  switch (action.type) {
    case "increment": return { count: state.count + 1 };
    case "set":       return { count: action.value };
    default: return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return <button onClick={() => dispatch({ type: "increment" })}>{state.count}</button>;
}
```

| Pick when | Detail |
|---|---|
| Multiple sub-values that update together | One reducer call instead of N setStates |
| State logic complex enough to test in isolation | Pure function |
| Action history matters | Easy to log dispatched actions |
| Move logic out of components | Reducer can be exported |

**`useRef` — three uses:**

| Use | Example |
|---|---|
| **DOM ref** | `<input ref={inputRef} />` then `inputRef.current.focus()` |
| **Mutable instance value** | `const idRef = useRef(0); idRef.current++;` |
| **Previous value** | Save in `useEffect`, read in next render |

```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}
```

| Property | Detail |
|---|---|
| Mutating `ref.current` | **Doesn't trigger re-render** |
| Persists across renders | Like instance var |
| Initial value | Set on first render |

**`useMemo` and `useCallback`:**

```jsx
const expensive = useMemo(() => computeStuff(items), [items]);
const handler   = useCallback((e) => fn(e, x), [x]);
```

| Hook | Purpose | When |
|---|---|---|
| `useMemo` | Cache computed value | Expensive calc per render |
| `useCallback` | Cache function identity | Pass to memoized children |
| Both | Reference stability | Avoid downstream re-renders |
| Don't reach for these reflexively | Premature optimization |

**`useContext`:**

```jsx
const ThemeContext = createContext("light");

function App() {
  return <ThemeContext.Provider value="dark"><Toolbar /></ThemeContext.Provider>;
}

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>...</div>;
}
```

| Property | Detail |
|---|---|
| Skip prop drilling | Read from any descendant |
| Re-renders all consumers when value changes | Sometimes too eagerly |
| Don't use for high-frequency state | Reach for state library |

**Custom hooks — share stateful logic:**

```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn(v => !v), []);
  return [on, toggle];
}

function useFetch(url) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then(d => !cancelled && setData(d))
      .catch(e => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
```

| Property | Detail |
|---|---|
| Name starts with `use` | Lint enforces hook rules |
| Returns whatever shape makes sense | Object / array / function |
| Each call gets independent state | Two `useToggle()` calls = two states |
| Not magic — just composes other hooks | Can call `useState`, `useEffect`, etc. |

**Effect dependency rules:**

| Pattern | Rule |
|---|---|
| Reading any reactive value (state, props) | List it as dep |
| Reading mutable refs | Don't list (refs aren't reactive) |
| Functions defined inside | Wrap in `useCallback` if you must include |
| Constant objects/arrays | Move outside component to keep stable |
| Linter warnings | Heed them — exhaustive-deps rule |

**Concurrent features (React 18+):**

| Hook | Purpose |
|---|---|
| `useTransition` | Mark a state update as non-urgent |
| `useDeferredValue` | Defer derived value to non-urgent rendering |
| `useId` | Stable unique IDs for SSR + a11y |
| `useSyncExternalStore` | Subscribe to external state safely under concurrent rendering |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| `if (cond) useEffect(...)` | Hook order broken |
| Effect to derive state from props | Compute in render |
| Effect chains setting state from props | Render loop / cascading |
| `useEffect` for sync DOM measurement → setState | Use `useLayoutEffect` |
| `useState` for non-reactive value | Use `useRef` |
| `useMemo` everywhere | Adds cost, not always wins |
| Custom hook that's only used once | Just inline it |
| Over-using context | Per-tree re-render storm |
| Forgetting cleanup | Memory leaks |

**Decision matrix:**

| Need | Pick |
|---|---|
| Single value of state | `useState` |
| Multiple related fields | `useReducer` |
| Side effect (fetch, subscribe) | `useEffect` |
| Sync measurement before paint | `useLayoutEffect` |
| Cached value | `useMemo` |
| Stable callback | `useCallback` |
| DOM access / mutable instance var | `useRef` |
| Tree-wide value | `useContext` |
| Subscribe to external store | `useSyncExternalStore` |
| Share logic between components | Custom hook |

**Cross-references:**

- useEffect vs useLayoutEffect: [useeffect_vs_uselayouteffect.md](../common_theory_prompts/useeffect_vs_uselayouteffect.md)
- Props vs state: [props_vs_state_*.md](props_vs_state_react_readonly_mutable_rerender.md)
- useEffect deep dive: [useeffect_*.md](useeffect_react_side_effect_cleanup_dependencies.md)
- Component composition: [component_composition_*.md](../frontend_architecture_patterns/component_composition_props_children_reuse.md)

**Rule of thumb:** **Top-level only, same order, React functions only.** Reach for **`useState`** for single values, **`useReducer`** when multiple values change together, **`useEffect`** for fetches / subscriptions, **`useRef`** for DOM or mutable instance values, **`useContext`** for tree-wide config. Pull stateful logic into **custom hooks** when two or more components share it. Don't sprinkle **`useMemo`** / **`useCallback`** until you've measured.
