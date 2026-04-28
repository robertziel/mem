### Component Composition — Props, Children, Slots, Reuse

**Definition:** **composition** builds UIs by combining smaller components. Data flows **down via props**, events flow **up via callbacks**. Composition beats inheritance for sharing UI — small, focused, configurable components nest naturally.

**Composition vs Inheritance:**

| Approach | Use when | Limits |
|---|---|---|
| **Composition** (children, slots, render props) | UI assembly, layout containers | None — most React UI is composed |
| **Inheritance** (extending a class component) | Almost never | Brittle hierarchies, hard to reuse |
| **Hooks** (logic reuse) | Sharing stateful logic | Replaces HOCs / render-props for behavior |

> "Composition over inheritance" — React (and most modern UI) is built around it.

**Five composition patterns:**

| Pattern | Sketch | Use |
|---|---|---|
| **Children** | `<Card>{content}</Card>` | Generic containers |
| **Multiple slots** (named children) | `<Layout sidebar={...} main={...}>` | Predefined regions |
| **Compound components** | `<Tabs><Tabs.Tab/></Tabs>` | Cohesive groups |
| **Render props** | `<Data render={item => ...}>` | Sharing stateful logic |
| **Custom hooks** | `useData()` | Sharing logic without UI shape |

**Pattern 1 — `children`:**

```jsx
function Card({ children }) {
  return <div className="card">{children}</div>;
}

<Card>
  <h2>Profile</h2>
  <p>Hello!</p>
</Card>
```

| Property | Detail |
|---|---|
| Anything between tags | Becomes `children` |
| Most flexible | Container doesn't care about contents |
| One slot only | If you need more, switch pattern |

**Pattern 2 — multiple "slots" via props:**

```jsx
function Layout({ header, sidebar, main, footer }) {
  return (
    <div className="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{main}</main>
      <footer>{footer}</footer>
    </div>
  );
}

<Layout
  header={<Nav />}
  sidebar={<Filters />}
  main={<Results />}
  footer={<FooterLinks />}
/>
```

| Property | Detail |
|---|---|
| Each slot named | Caller doesn't worry about order |
| Allows null / fallback | `header={header ?? <DefaultNav />}` |
| Strong types in TS | Each slot has its own type |
| Web Components equivalent | `<slot name="...">` |

**Pattern 3 — compound components:**

```jsx
const Tabs = ({ children, defaultIndex = 0 }) => {
  const [active, setActive] = useState(defaultIndex);
  return <TabsContext.Provider value={{ active, setActive }}>
    <div className="tabs">{children}</div>
  </TabsContext.Provider>;
};

Tabs.List = ({ children }) => <div role="tablist">{children}</div>;
Tabs.Tab  = ({ index, children }) => {
  const { active, setActive } = useContext(TabsContext);
  return <button aria-selected={active === index} onClick={() => setActive(index)}>{children}</button>;
};
Tabs.Panel = ({ index, children }) => {
  const { active } = useContext(TabsContext);
  return active === index ? <div>{children}</div> : null;
};
```

```jsx
<Tabs>
  <Tabs.List>
    <Tabs.Tab index={0}>Profile</Tabs.Tab>
    <Tabs.Tab index={1}>Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel index={0}>...</Tabs.Panel>
  <Tabs.Panel index={1}>...</Tabs.Panel>
</Tabs>
```

| Win | Detail |
|---|---|
| Cohesive API | Caller composes naturally |
| Implicit shared state | Via Context |
| Discoverable | `Tabs.X` autocomplete |
| Trade-off | Coupling between sub-components |

**Pattern 4 — render props (less common today):**

```jsx
function MouseTracker({ render }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {render(pos)}
    </div>
  );
}

<MouseTracker render={({ x, y }) => <div>{x},{y}</div>} />
```

| Property | Detail |
|---|---|
| Pass a function as a prop | Caller decides rendering |
| Predates hooks | Hooks usually replace this |
| Still useful | When the consumer needs to opt into rendering shape |
| Variant | Children-as-function: `<X>{(state) => ...}</X>` |

**Pattern 5 — custom hooks (logic reuse without UI):**

```jsx
function useMouse() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = e => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

function Cursor() {
  const { x, y } = useMouse();
  return <div>{x},{y}</div>;
}
```

| Win | Detail |
|---|---|
| Logic without imposing UI shape | Each consumer decides rendering |
| Works in functional components | All modern React |
| Replaces HOCs and most render props | Cleaner |
| Naming | `useX` convention |

**Data flow — props down, events up:**

```
   Parent
     │ data via props
     ▼
   Child
     │ events via onX callbacks
     ▼
   Parent
```

| Direction | Mechanism |
|---|---|
| Down | `<Child value={x} />` |
| Up | `<Child onChange={(v) => ...} />` |
| Skipping levels | Context or state library |

**When to lift state up:**

| Signal | Action |
|---|---|
| Two siblings need same state | Lift to common parent |
| Form fields with controlled inputs | Parent owns state |
| Cross-cutting context (theme, auth) | Context provider |
| Deep prop drilling | Context or state library |

**When NOT to lift:**

| Signal | Better |
|---|---|
| Unique to one component | Local `useState` |
| Modal open/close | Local |
| Hover state | Local |
| Form input value | Either local or lifted |

**Polymorphic component (`as` prop):**

```jsx
function Button({ as: Tag = "button", children, ...rest }) {
  return <Tag className="btn" {...rest}>{children}</Tag>;
}

<Button>Click</Button>          // <button>
<Button as="a" href="/">Go</Button>  // <a>
```

| Property | Detail |
|---|---|
| Render as different tag/component | One source of styling |
| Forwards rest props | `...rest` |
| TypeScript needs care | Generic component pattern |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Inheritance hierarchies | Brittle; React removed `class.extend(Component)` for this |
| Massive components (500+ lines) | Hard to test, reuse |
| Over-abstracting too early | YAGNI; extract on the third use |
| Prop drilling 5+ levels | Context or state library |
| HOCs everywhere (legacy) | Hooks usually cleaner |
| `cloneElement` for everything | Magic; prefer explicit composition |
| One mega-prop with everything | Hard to reason about |
| `forwardRef` chains | Painful; restructure |

**TypeScript prop typing:**

```typescript
type CardProps = {
  title: string;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  onSelect?: (id: string) => void;
};

function Card({ title, variant = "primary", children, onSelect }: CardProps) { ... }
```

| Type | Use |
|---|---|
| `React.ReactNode` | Anything renderable |
| `React.ReactElement` | Single element |
| `JSX.Element` | A single JSX expression |
| `React.PropsWithChildren<T>` | T plus `children` |
| `React.ComponentProps<typeof X>` | Steal another component's props |

**Decision matrix:**

| Need | Pick |
|---|---|
| Generic container | `children` |
| Layout with named regions | Slots via props |
| Cohesive group like Tabs/Menu | Compound components |
| Share stateful logic | Custom hook |
| Share UI behavior with caller-controlled rendering | Render prop / children-as-function |
| Render as different element | Polymorphic `as` prop |
| Cross-cutting state (theme, auth) | Context |
| Application-wide state | Redux / Zustand / similar |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Passing JSX as a prop instead of children | Looks weird; usually wrong |
| Mutating `children` directly | React expects immutability |
| Many props instead of `children` | Container becomes brittle |
| Passing the whole object when one field would do | Re-renders cascade |
| Using `key` on stable lists | Confuses reconciler |
| Dynamic component types as inline objects | New ref each render → re-render storm |

**Cross-references:**

- Props vs state: [props_vs_state_*.md](../react/props_vs_state_react_readonly_mutable_rerender.md)
- Hooks (state + lifecycle): [hooks_*.md](../react/hooks_react_usestate_useeffect_custom_lifecycle.md)
- useEffect: [useeffect_*.md](../react/useeffect_react_side_effect_cleanup_dependencies.md)

**Rule of thumb:** **Composition > inheritance.** Build small, focused components and stack them via **`children`**, **slots**, **compound components**, and **custom hooks**. **Props down, events up.** Lift state to the smallest common parent — if you're prop-drilling 5 levels, use **Context** or a state library. Extract on the **third use**, not the first.
