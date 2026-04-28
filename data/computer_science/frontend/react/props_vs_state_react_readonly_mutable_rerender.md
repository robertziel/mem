### React — Props vs State

**Definition:** **Props** are the inputs passed from a parent — read-only from the child's perspective. **State** is local data the component owns and can change. Both trigger re-renders when they change. The most common mistake is **copying props into state**.

**Side-by-side:**

| Property | **Props** | **State** |
|---|---|---|
| Owner | Parent component | This component |
| Mutable from inside? | **No** (read-only) | Yes (via setter) |
| Triggers re-render? | When parent re-renders with new value | When `setX` is called with new value |
| Lives across renders? | Yes | Yes |
| Initial value | Whatever parent passes | First arg to `useState` |
| Syncing with prop changes | Compute during render or useEffect | Don't copy props into state |
| Naming | Whatever parent decides | Whatever you decide |
| Pattern | Pure function arg | Mutable cell owned by component |

**Quick demo:**

```jsx
function Card({ title }) {                  // title is a prop (read-only)
  const [open, setOpen] = useState(false);  // open is state (mutable)

  return (
    <div>
      <h3>{title}</h3>
      <button onClick={() => setOpen(o => !o)}>
        {open ? "Hide" : "Show"}
      </button>
      {open && <p>Detail content</p>}
    </div>
  );
}
```

**The "don't copy props into state" anti-pattern:**

```jsx
// ❌ ANTI-PATTERN — state goes stale when prop changes
function Profile({ user }) {
  const [name, setName] = useState(user.name);   // copied!
  return <input value={name} onChange={e => setName(e.target.value)} />;
}

// Parent passes a new user, but `name` keeps old value
```

| Why bad | Detail |
|---|---|
| State only initializes on first render | New `user` prop ignored |
| Two sources of truth | Confusing |
| Adds unnecessary `useEffect(() => setName(user.name), [user])` | More code, more bugs |

**Three correct alternatives:**

| Alternative | When |
|---|---|
| **Use the prop directly** | Most cases — parent owns the data |
| **Lift state up** | Multiple children share editable value |
| **Initial value + key remount** | Reset state when key prop changes |

```jsx
// ✅ Use prop directly (controlled by parent)
function Profile({ name, onNameChange }) {
  return <input value={name} onChange={e => onNameChange(e.target.value)} />;
}

// ✅ Reset via key prop
<Profile key={user.id} user={user} />   // remounts when id changes
```

**Re-render triggers — what causes one:**

| Cause | Detail |
|---|---|
| Local `useState` setter called with **different** value | Yes |
| Parent re-renders, passing new prop reference | Yes (even if logically same) |
| Context value changes | All consumers re-render |
| `forceUpdate` (rare) | Yes |
| `useReducer` dispatch with different state | Yes |
| Same value via setter | **No** — React bails out |

**Reference equality matters — common surprise:**

```jsx
// Parent re-renders → creates new {} → child gets new prop ref → re-renders
function Parent() {
  return <Child config={{ option: true }} />;   // new object every render
}

// Fix: useMemo or move out
const config = useMemo(() => ({ option: true }), []);
return <Child config={config} />;
```

| Property | Detail |
|---|---|
| Objects / arrays compare by reference | New literal each render |
| `React.memo` skips render if **shallow-equal** props | But shallow ≠ deep |
| Inline lambdas / objects | Defeat `React.memo` |
| `useMemo` / `useCallback` | Stabilize references for memoized children |

**State updates are batched + asynchronous:**

```jsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);    // both see same `count` — final +1
}

// Use updater form when next depends on prev:
function handleClick() {
  setCount(c => c + 1);
  setCount(c => c + 1);   // +2 total
}
```

| Property | Detail |
|---|---|
| React 18+ | Batches across promises and timeouts (automatic batching) |
| Multiple `setX` in same handler | One re-render |
| Reading state right after setting | Still old value |
| Updater function | Sees latest committed state |

**Lifting state up — when to do it:**

```jsx
// Two siblings need to share `tab` — lift it to the parent
function Tabs() {
  const [active, setActive] = useState(0);
  return (
    <>
      <TabList active={active} onChange={setActive} />
      <TabPanel active={active} />
    </>
  );
}
```

| Signal | Action |
|---|---|
| Two siblings need same value | Lift to common parent |
| Form fields — controlled inputs | Lift to form parent |
| Cross-cutting (theme, auth) | Context |
| Application-wide | Redux / Zustand / Jotai |

**Derived state — usually don't store, compute:**

```jsx
// ❌ Derived state stored
const [items, setItems] = useState([]);
const [filtered, setFiltered] = useState([]);
useEffect(() => setFiltered(items.filter(i => i.active)), [items]);

// ✅ Just compute in render
const filtered = items.filter(i => i.active);

// ✅ With memoization if expensive
const filtered = useMemo(() => items.filter(i => i.active), [items]);
```

| Pattern | Detail |
|---|---|
| Derive during render | Cheap; React re-runs anyway |
| `useMemo` | Only when computation is expensive |
| Storing derived in state | Bug-prone — has to re-sync |
| `useEffect` to sync derived | Almost always wrong |

**Controlled vs uncontrolled inputs:**

| Pattern | Detail |
|---|---|
| **Controlled** | Value comes from state; `value={x}` + `onChange` |
| **Uncontrolled** | DOM owns the value; access via `useRef` |
| Default | Controlled — easier to validate, reset, sync |
| Use uncontrolled when | File inputs, integrating non-React libs |

**State design checklist:**

| Question | Answer |
|---|---|
| Is this from props? Don't store. | Use prop directly |
| Is this derived? Compute. | `useMemo` if heavy |
| Does it change in reaction to user input? | State |
| Should multiple components see it? | Lift up |
| Should the whole tree see it? | Context |
| Should many trees share it? | Global state library |

**Passing props down — pitfalls:**

| Pitfall | Effect |
|---|---|
| Prop drilling 5+ levels | Refactor to context |
| Passing whole object when one field needed | Avoid; pass field |
| Inline object/array as prop | New ref each render |
| Renaming prop on every level | Confusing |
| Boolean flags piling up | Maybe use a config prop or compound components |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Copying props into state | Stale state |
| Reading state right after setX | Still old |
| Forgetting updater form for prev-based updates | Last write wins |
| Mutating state directly (`state.x = y`) | React doesn't notice; no re-render |
| `setState` in render | Infinite loop |
| Inline lambdas / objects defeating `React.memo` | Re-renders cascade |
| Many state slots that could be one object | OK — but updates need spread |
| `useEffect` to sync derived state | Compute it instead |
| Storing functions in state | Setter `(prev) => fn` is treated as updater — wrap in object |

**Cross-references:**

- Hooks (state + effects): [hooks_*.md](hooks_react_usestate_useeffect_custom_lifecycle.md)
- useEffect: [useeffect_*.md](useeffect_react_side_effect_cleanup_dependencies.md)
- Component composition: [component_composition_*.md](../frontend_architecture_patterns/component_composition_props_children_reuse.md)

**Rule of thumb:** **Props down (read-only), state local (mutable via setter), events up.** **Don't copy props into state** — use the prop directly, lift state up, or remount via `key` to reset. **Don't store derived state** — compute it during render (with `useMemo` only if it's expensive). Updater function (`setX(prev => ...)`) when next depends on prev. Mutating state directly never re-renders.
