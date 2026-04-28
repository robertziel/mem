### CSS Cascade Layers (`@layer`)

**Definition:** named buckets that **group CSS rules in an explicit precedence order** — *between* the rules of one layer, normal cascade rules apply (specificity, source order); *between* layers, **layer order wins**.

**Cascade priority (high → low simplification):**

| Tier | Detail |
|---|---|
| 1. `!important` user-agent | Top |
| 2. `!important` user | |
| 3. `!important` author | |
| 4. **Animations** | |
| 5. Author normal | Includes layered + unlayered |
| 6. User normal | |
| 7. User-agent normal | |
| 8. **Transitions** | |

> Within "author normal", **unlayered styles beat layered styles**. Among layers, **later-declared layer wins**.

**Within author normal — winner order:**

```
[ unlayered author rules ]      ← always strongest
[ layer last in @layer order ]
[ layer next-to-last ]
[ … ]
[ layer first in @layer order ] ← weakest
```

**Syntax:**

| Form | Meaning |
|---|---|
| `@layer base, components, utilities;` | Declare layer order (without rules) |
| `@layer base { … }` | Add rules to a layer |
| `@layer base { @import 'reset.css'; }` | Import into a layer |
| `@layer { … }` (anonymous) | Adds an anonymous layer in order |
| `@layer base.theme { … }` | Nested sub-layer (`.` separator) |

**Example:**

```css
@layer reset, base, components, utilities;

@layer base {
  button { color: black; }
}

@layer utilities {
  .text-red { color: red; }   /* wins over base */
}

button.text-red { /* unlayered — beats both */ }
```

**Why this is useful:**

| Problem (without layers) | With layers |
|---|---|
| Third-party CSS overriding your styles | Put vendor CSS in an early layer |
| Specificity wars (multiple `!important`) | Order layers; ditch most `!important` |
| Component / utility ordering arguments | Declare order once at the top |
| Cherry-picking which `@import` wins | Import each into named layers |
| Resetting styles cleanly | `@layer reset { ... }` lowest precedence |
| Tailwind ordering with custom CSS | Tailwind exposes layers (`base`, `components`, `utilities`) — extend them |

**Common layer architecture (most apps):**

| Layer | Holds |
|---|---|
| `reset` | Normalize / reset |
| `base` | Element defaults, typography |
| `components` | Reusable UI pieces (buttons, cards) |
| `utilities` | Atomic helpers (Tailwind-style) |
| Unlayered | App-specific, page-specific overrides — **highest precedence** within author |

**Tailwind v3+ defaults:**

```css
@tailwind base;        /* registers @layer base */
@tailwind components;
@tailwind utilities;

/* Add your own */
@layer components {
  .btn-primary { @apply bg-blue-600 text-white; }
}
```

**Specificity recap (still applies inside a layer):**

| Selector | Specificity |
|---|---|
| Inline style | 1,0,0,0 |
| `#id` | 0,1,0,0 |
| `.class`, `[attr]`, `:hover` | 0,0,1,0 |
| `tag`, `::before` | 0,0,0,1 |
| `*`, `:where(…)` | 0,0,0,0 |
| `:is(.a, #b)` takes max specificity of arguments | (specificity of #b) |

> `:where(…)` is the modern way to define low-specificity selectors — useful inside reset/base layers.

**Anonymous layers — small caveat:**

```css
@layer { /* anonymous */
  body { font-family: system-ui; }
}
```

Anonymous layers are useful for one-off scoping but you can't reference them by name later — declare named layers up front for clarity.

**Sub-layers (nested):**

```css
@layer components.button {
  /* high precedence inside components, but still beneath utilities */
}
```

**`@import` into a layer:**

```css
@import url("vendor.css") layer(vendor);
```

Vendor CSS lives in its own layer; your styles can put `vendor` first in the layer order to ensure your code wins.

**Browser support:** all modern browsers since 2022 (Chromium 99+, Firefox 97+, Safari 15.4+). Old IE-style fallbacks generally don't apply — production-safe today.

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting unlayered author CSS beats layered | Surprised when a layered utility doesn't override a plain rule |
| Declaring layer order **after** filling them | Order set on first declaration; later `@layer name` reorders |
| Mixing `!important` and layers | `!important` flips precedence — layered `!important` rules go in **reverse** layer order |
| Treating layers as scopes | They're precedence groups, not encapsulation |
| Over-layering | 5+ layers usually means refactor |
| Using layers without thinking about specificity | Specificity within a layer still wins |
| Putting Tailwind utilities in an early layer | They lose to your components — flip order intentionally |

**`!important` interaction:**

| Rule | Detail |
|---|---|
| Two `!important` rules in same layer | Higher specificity wins |
| Two `!important` rules across layers | **Earlier-declared layer wins** (reverse of normal rules) |
| `!important` in unlayered + `!important` in layer | Unlayered still wins |
| User stylesheet `!important` | Beats all author `!important` (yes, even user-agents lose to user) |

> The reverse-order rule for `!important` is intentional — it keeps the spirit that "important reset rules" still beat "important utility rules".

**Use-case quick map:**

| Need | Pattern |
|---|---|
| Reset / normalize | `@layer reset` (lowest precedence) |
| Design system base | `@layer base` |
| Component library | `@layer components` |
| Tailwind utilities | `@layer utilities` (high precedence) |
| Third-party CSS | Wrap with `@import url("...") layer(vendor);` |
| Page-specific overrides | Leave **unlayered** so they always win |
| App-wide theme tokens (CSS custom properties) | `@layer base { :root { --color-... } }` |

**Tools / linters:**

| Tool | Use |
|---|---|
| **stylelint** | `@stylistic/stylelint-plugin` for layer-related rules |
| **PostCSS** | Process `@layer` reliably |
| **Tailwind v3+** | Native layer awareness |
| **CSS Modules / scoped styles** | Often layer-friendly |

**Cross-references:**

- CSS specificity / cascade fundamentals: search `frontend/css_theory_keys/specificity.md` and `cascade.md`
- Inheritance: `frontend/css_theory_keys/inheritance.md`

**Rule of thumb:** **layers control precedence between style groups; specificity controls precedence within a group.** Declare layer order **once** at the top of your stylesheet (`@layer reset, base, components, utilities;`). **Unlayered author CSS always beats layered**, so reserve unlayered for true page-level overrides. **`!important` reverses the order** — useful and surprising; learn it once.
