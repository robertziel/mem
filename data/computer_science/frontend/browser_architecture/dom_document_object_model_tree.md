### DOM — Document Object Model (Tree)

**Definition:** the **DOM** is the browser's in-memory tree representation of an HTML document. JavaScript reads and mutates the DOM to change the UI. The DOM + the CSSOM produce the render tree, which then goes through layout / paint / composite.

**Anatomy:**

```
document
   └─ <html>
       ├─ <head>
       │   ├─ <title>
       │   └─ <link>
       └─ <body>
           ├─ <header>
           ├─ <main>
           │   ├─ <h1>Hello</h1>
           │   └─ <p>World</p>
           └─ <footer>
```

| Node type | Examples |
|---|---|
| **Document** | `document` itself |
| **Element** | `<div>`, `<p>`, `<a>` |
| **Text** | The string between tags |
| **Comment** | `<!-- ... -->` |
| **DocumentFragment** | Off-document subtree |
| **Attr** (legacy) | Attributes on elements |

**DOM tree vs HTML source — they're not the same:**

| Property | HTML source | DOM tree |
|---|---|---|
| Form | Bytes | In-memory objects |
| Errors | Lenient (parser fixes most) | Always valid tree |
| Comments | Preserved | Preserved as nodes |
| Scripts | Source text | Already executed |
| Modifications | Static | Live (JS can mutate) |
| Whitespace | As-typed | Often kept as text nodes |

**Querying the DOM:**

| API | Returns |
|---|---|
| `document.getElementById("x")` | Single element or null |
| `document.querySelector(".x")` | First match or null |
| `document.querySelectorAll(".x")` | Static `NodeList` |
| `document.getElementsByClassName("x")` | **Live** `HTMLCollection` |
| `document.getElementsByTagName("p")` | **Live** `HTMLCollection` |
| `el.children` | Live, element-only |
| `el.childNodes` | Live, includes text + comments |

> **Live collections** update when the DOM changes; **static** ones don't. Most modern code uses `querySelectorAll`.

**Mutating the DOM:**

```javascript
// Create
const li = document.createElement("li");
li.textContent = "Two";

// Insert
document.querySelector("#list").appendChild(li);

// Bulk insert (faster — fragment)
const frag = document.createDocumentFragment();
items.forEach(t => {
  const el = document.createElement("li");
  el.textContent = t;
  frag.appendChild(el);
});
list.appendChild(frag);   // single layout-trigger

// Modern declarative APIs
list.append(li1, li2, li3);          // append multiple
list.replaceChildren(li1, li2);      // wipe + replace
li.insertAdjacentHTML("beforeend", "<span>!</span>");

// Remove
li.remove();
```

| API | Use |
|---|---|
| `appendChild(node)` | Single insert |
| `append(...nodes)` | Multiple, modern |
| `prepend(...nodes)` | Multiple, at start |
| `before(...nodes)` / `after(...nodes)` | Sibling-relative |
| `replaceWith(...nodes)` | Replace the element |
| `replaceChildren(...nodes)` | Wipe + insert |
| `remove()` | Detach from parent |
| `cloneNode(deep)` | Deep or shallow copy |
| `insertAdjacentHTML(pos, html)` | Parse string and insert |

**The DOM-write performance trap:**

| Pattern | Effect |
|---|---|
| Many `appendChild` in a loop | Layout / reflow per insert |
| `DocumentFragment` then one append | One layout |
| Read property → write style → read property → write style | **Layout thrashing** (forced sync layout) |
| Detach element, edit subtree, re-attach | One layout |
| `requestAnimationFrame` for batched DOM work | Aligned with frame |

**Layout thrashing example:**

```javascript
// ❌ BAD — read/write/read/write triggers sync layout each read
items.forEach(el => {
  el.style.width = "100px";
  const h = el.offsetHeight;       // forces sync layout
  el.style.height = h + "px";       // invalidates again
});

// ✅ GOOD — batch reads, then batch writes
const heights = items.map(el => el.offsetHeight);
items.forEach((el, i) => {
  el.style.width = "100px";
  el.style.height = heights[i] + "px";
});
```

| Read trigger (forces layout) | Write trigger (invalidates) |
|---|---|
| `offsetWidth/Height` | `style.*` |
| `clientWidth/Height` | `className` |
| `scrollTop/Left/Width/Height` | `innerHTML` |
| `getBoundingClientRect()` | DOM mutations |
| `getComputedStyle()` | Class toggle |

**Common selectors:**

| Selector | Matches |
|---|---|
| `#id` | By ID |
| `.class` | By class |
| `tag` | By tag |
| `[attr=val]` | By attribute |
| `parent > child` | Direct child |
| `ancestor descendant` | Any descendant |
| `a + b` | Adjacent sibling |
| `a ~ b` | Following sibling |
| `:not(...)` | Negation |
| `:has(...)` | Has descendant (modern) |

**Events on the DOM:**

| Concept | Detail |
|---|---|
| `addEventListener(type, handler, options)` | Subscribe |
| `event.target` | Where it fired |
| `event.currentTarget` | Where listener is attached |
| **Capturing → target → bubbling** | Three-phase propagation |
| `event.stopPropagation()` | Stop further phases |
| `event.preventDefault()` | Cancel default action |
| `{ once: true }` | Auto-remove after fire |
| `{ passive: true }` | Promise not to call preventDefault — better scroll perf |

**Event delegation pattern:**

```javascript
// Listen once on parent, dispatch by target
document.querySelector("#list").addEventListener("click", e => {
  const li = e.target.closest("li");
  if (li) handleItem(li);
});
```

| Win | Detail |
|---|---|
| One listener instead of N | Memory + setup cost |
| Works for added items | New `<li>` automatic |
| `.closest(selector)` | Walks up the tree |

**DOM size and performance:**

| Concern | Detail |
|---|---|
| Total node count | Big DOM = expensive layout |
| Depth | Deep trees → expensive selectors |
| Lighthouse warning | > 1500 nodes flagged |
| Virtualization | Render visible items only (long lists) |
| `content-visibility: auto` | Skip rendering off-screen subtrees |

**Modern DOM APIs worth knowing:**

| API | Use |
|---|---|
| `MutationObserver` | Watch for DOM changes |
| `ResizeObserver` | Watch element size changes |
| `IntersectionObserver` | Watch viewport visibility |
| `requestAnimationFrame` | Schedule before next paint |
| `requestIdleCallback` | Run when browser idle |
| Shadow DOM | Encapsulated subtree (Web Components) |
| `<template>` | Inert markup; clone to use |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `innerHTML = ...` with user input | XSS risk |
| Live `HTMLCollection` in a loop | Iterating mutates length |
| Sync layout in loops | Layout thrashing |
| Listeners not removed on unmount | Memory leak |
| Heavy work in event handlers | Jank |
| Forgetting `event.preventDefault()` on form submit | Page reload |
| Reading layout property mid-write | Forces sync layout |
| Querying `document` repeatedly in hot paths | Cache the reference |

**Cross-references:**

- Render pipeline (DOM → CSSOM → Layout → Paint): [rendering_pipeline_*.md](rendering_pipeline_dom_cssom_layout_paint_composite.md)
- Compositing + layer promotion: [compositing_*.md](compositing_gpu_layers_will_change.md)
- Event loop ordering (microtasks vs tasks): [event_loop_*.md](../common_theory_prompts/event_loop_ordering.md)

**Rule of thumb:** **The DOM is your UI's data model — keep it small and mutate it cheaply.** Use **`DocumentFragment`** or **`replaceChildren`** to batch inserts; **batch reads then writes** to avoid layout thrashing; reach for **`MutationObserver` / `IntersectionObserver`** for reactive watching. Use **event delegation** when listeners would otherwise multiply per item. Avoid `innerHTML` with untrusted input — XSS lives there.
