### JavaScript Event Loop — Ordering & Priorities

**Definition:** the **event loop** processes work in a strict order: synchronous call stack → all microtasks → one macrotask → render → repeat. **Microtasks (Promises) flush before macrotasks (timers)**, which is why `Promise.resolve().then(...)` always beats `setTimeout(..., 0)`.

**The order, in one diagram:**

```
   ┌──────────────────┐
   │  Call stack      │   ← currently executing JS
   └────────┬─────────┘
            │ stack empty
            ▼
   ┌──────────────────┐
   │  Microtask queue │   ← FIFO; drained completely each tick
   │  (Promises,      │
   │   queueMicrotask)│
   └────────┬─────────┘
            │ all done
            ▼
   ┌──────────────────┐
   │  Render          │   ← rAF callbacks, layout, paint
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │  Macrotask       │   ← ONE task: setTimeout, I/O, message
   │  queue (FIFO)    │
   └────────┬─────────┘
            │ next tick
            ▼
       (back to top)
```

**The two queue types:**

| Queue | Drain rule | Sources |
|---|---|---|
| **Microtask** | **Drained fully** every tick | Promise `.then`, `queueMicrotask`, `MutationObserver` |
| **Macrotask** | **One task** per tick | `setTimeout`, `setInterval`, I/O, `MessageChannel`, UI events |

**Demo:**

```javascript
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
queueMicrotask(() => console.log("D"));
console.log("E");

// Output: A, E, C, D, B
```

| Order | Why |
|---|---|
| A | Sync |
| E | Sync |
| C, D | Microtasks (in order queued) |
| B | Macrotask (timer) |

**Microtask starvation — the trap:**

```javascript
// ❌ This blocks rendering
function loop() {
  Promise.resolve().then(loop);
}
loop();   // microtask never empties → render never runs
```

| Property | Detail |
|---|---|
| Each tick drains all microtasks | If they keep adding more, never advances |
| Macrotasks are starved | `setTimeout` never fires |
| Render is starved | Browser hangs |
| Use `setTimeout(loop, 0)` instead | Yields to render |

**Microtasks vs `setTimeout(0)`:**

| Mechanism | Latency | Yields to render? |
|---|---|---|
| `Promise.resolve().then(...)` | Same tick | **No** |
| `queueMicrotask(...)` | Same tick | **No** |
| `setTimeout(..., 0)` | Next tick (≥1ms in browsers) | **Yes** |
| `requestAnimationFrame(...)` | Before next paint | Aligned to render |
| `requestIdleCallback(...)` | When idle | Yes |
| `MessageChannel` postMessage | Next tick, faster than `setTimeout(0)` | Yes |

**The "after current code" pattern:**

| Need | Use |
|---|---|
| Run after current sync work | `queueMicrotask(fn)` |
| Run after sync + render | `setTimeout(fn, 0)` |
| Run before next paint | `requestAnimationFrame(fn)` |
| Run when idle | `requestIdleCallback(fn)` |
| Run after Promise resolves | `.then(fn)` |

**`async`/`await` is microtasks under the hood:**

```javascript
async function example() {
  console.log("1");
  await null;            // suspend; resume in microtask
  console.log("2");
}

example();
console.log("3");
// Output: 1, 3, 2
```

| Step | Detail |
|---|---|
| `await null` | Resumes in next microtask, even with no actual async work |
| Hidden cost | Every `await` is a microtask checkpoint |

**Promise chain gotcha:**

```javascript
Promise.resolve()
  .then(() => console.log("A"))
  .then(() => console.log("B"));

Promise.resolve()
  .then(() => console.log("C"))
  .then(() => console.log("D"));

// Output: A, C, B, D — interleaved
```

| Why | Detail |
|---|---|
| Each `.then` queues a microtask | Each microtask schedules the next `.then` |
| Both chains advance one step at a time | Not "all of A, then all of B" |

**Browser tasks queue (high-level — implementation varies):**

| Source | Queue |
|---|---|
| User input events | Macrotask |
| Timer callbacks | Macrotask |
| Network completion | Macrotask |
| Promise callbacks | Microtask |
| `MutationObserver` | Microtask |
| `queueMicrotask` | Microtask |
| `requestAnimationFrame` | Special — run before render |
| `requestIdleCallback` | Special — when idle |

**Node.js — different model, same concepts:**

| Phase (libuv) | Detail |
|---|---|
| Timers | `setTimeout`, `setInterval` |
| Pending callbacks | I/O callbacks deferred from prev cycle |
| Idle, prepare | Internal |
| **Poll** | I/O events |
| Check | `setImmediate` |
| Close callbacks | `'close'` events |
| Microtasks | After **each phase**, drained |

| Difference vs browser | Detail |
|---|---|
| `setImmediate` | Node-only, runs after I/O poll |
| `process.nextTick` | Higher priority than promises (microtask-like) |
| Phases | Discrete loop stages |
| Render | Not relevant in Node |

**Long task warning:**

| Threshold | Detail |
|---|---|
| Tasks > 50ms | "Long task" — flagged in Lighthouse |
| Blocks input | User feels jank |
| Mitigation | Break work into chunks; use `requestIdleCallback` |
| `scheduler.yield()` (modern) | Native API to yield to higher-priority work |

**Practical patterns:**

```javascript
// Yield to render mid-loop
async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);
    if (i % 100 === 0) await new Promise(r => setTimeout(r, 0));
  }
}

// Run after Vue/React state update
queueMicrotask(() => measure());

// Run before next frame
requestAnimationFrame(() => element.style.transform = "...");
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Recursive `Promise.then` | Starves render |
| Heavy work in event handler | Long task; janky scroll |
| `setTimeout(fn, 0)` for "right after" sync | Slower than microtask; yields to render (good for this) |
| Forgetting `await` blocks parent | Caller doesn't wait |
| Mixing `process.nextTick` and Promises in Node | Subtle ordering bugs |
| Reading layout in microtask after DOM write | Forces sync layout |
| Many small `setTimeout(0)` | Each ≥1–4ms in some browsers |

**Cross-references:**

- DOM mutations + layout thrashing: [dom_*.md](../browser_architecture/dom_document_object_model_tree.md)
- Render pipeline: [rendering_pipeline_*.md](../browser_architecture/rendering_pipeline_dom_cssom_layout_paint_composite.md)
- Async/await + Promises: [async_await_*.md](../javascript_core_theory/async_await_promise_try_catch.md)
- Concurrency / I/O blocking: [concurrency_io_*.md](../../os_cs_fundamentals/concurrency_io_blocking_beam_processes.md)

**Rule of thumb:** **Microtasks before macrotasks; both before the next frame.** `Promise.then` runs in the same tick; `setTimeout(0)` waits for the next. Use **`queueMicrotask`** for "run after current sync work without yielding rendering," **`setTimeout(0)`** when you want to yield, **`requestAnimationFrame`** for visual updates. Don't recursively schedule microtasks — you'll starve the renderer.
