### JavaScript — Call Stack (LIFO, Frames, Overflow)

**Definition:** the **call stack** tracks nested function calls. Each call **pushes** a frame; each return **pops** one. **LIFO** order. JavaScript runs on a **single call stack** per agent (one thread of synchronous execution); the event loop schedules everything else around it.

**Anatomy of a frame:**

| Component | Detail |
|---|---|
| Function reference | What's running |
| Local variables | `let` / `const` / `var` in scope |
| Arguments | Bound parameters |
| `this` binding | Context (varies by call style) |
| Return address | Where execution resumes after return |

**Stack growth:**

```javascript
function a() { b(); }
function b() { c(); }
function c() { /* deepest */ }

a();

// Stack at deepest:
//   c()
//   b()
//   a()
//   <main>
```

| Step | Stack |
|---|---|
| Call `a()` | `[a, main]` |
| `a` calls `b()` | `[b, a, main]` |
| `b` calls `c()` | `[c, b, a, main]` |
| `c` returns | `[b, a, main]` |
| `b` returns | `[a, main]` |
| `a` returns | `[main]` |

**Stack overflow — when it happens:**

```javascript
function recurse() { recurse(); }
recurse();
// RangeError: Maximum call stack size exceeded
```

| Cause | Detail |
|---|---|
| Unbounded recursion | No base case |
| Mutual recursion | A calls B calls A |
| Very deep recursion | Even with proper base case, big inputs |
| Default JS stack size | ~10K–30K frames depending on engine |
| Engine-specific | V8 ~10K, Spider monkey similar |

**Tail-call optimization (TCO) — barely relevant:**

| Property | Detail |
|---|---|
| ES2015 spec mandates TCO | "Proper tail calls" |
| **Only Safari implemented it** | V8 / SpiderMonkey did not |
| Practical answer | Don't rely on TCO; rewrite recursion as loops |
| Workaround | Use trampolining or convert to iteration |

**Recursion → iteration conversion:**

```javascript
// Recursive (overflow risk)
function sumTo(n) {
  if (n === 0) return 0;
  return n + sumTo(n - 1);
}

// Iterative (no stack growth)
function sumTo(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
}

// Trampolining for tree-shaped recursion
function trampoline(fn) {
  return (...args) => {
    let result = fn(...args);
    while (typeof result === "function") result = result();
    return result;
  };
}
```

**The single-threaded nature:**

```
   Browser tab / agent
     ┌────────────────┐
     │  Call stack    │   ← single — only one thing runs at a time
     │  (one frame    │
     │   at a time)   │
     └───────┬────────┘
             │ stack empty
             ▼
   ┌──────────────────────┐
   │  Event loop          │
   └──────────────────────┘
```

| Implication | Detail |
|---|---|
| One synchronous task at a time | No real parallelism in user code |
| Long sync work blocks events | UI freezes |
| Async work runs **between** stack frames | Via event loop |
| Web Workers | True parallelism, but separate stacks |
| `SharedArrayBuffer` + Atomics | Communicate, not share stacks |

**Long task = blocked stack:**

| Symptom | Detail |
|---|---|
| Frozen scroll | Main thread busy |
| Click delays | Event handler queued |
| Animations stutter | Render task queued |
| Lighthouse "Long Task" warning | > 50ms continuous work |

**Mitigation:**

| Technique | Effect |
|---|---|
| Break work into chunks with `setTimeout(0)` / `await` | Yields between chunks |
| `requestIdleCallback` | Run when idle |
| Web Workers | Off main thread entirely |
| `scheduler.yield()` (modern) | Native scheduler API |
| Streaming / paginating | Don't load 10MB JSON at once |

**`this` binding by call style — affects what's in the frame:**

| Call | `this` |
|---|---|
| `obj.method()` | `obj` |
| `fn()` (loose) | `undefined` (strict) / `globalThis` (sloppy) |
| `fn.call(ctx)` / `fn.apply(ctx, args)` | `ctx` |
| `fn.bind(ctx)()` | `ctx` |
| `new Cls()` | New instance |
| Arrow function | Lexical (parent's) |
| DOM event handler | The element |

**Stack traces — reading them:**

```
Error: Bad input
    at validate (utils.js:14:11)         ← deepest
    at Order.create (order.js:42:5)
    at handler (api/orders.js:8:9)
    at <anonymous>                       ← shallowest
```

| Property | Detail |
|---|---|
| Top of stack = where error thrown | Deepest call |
| Bottom = entry point | Often the event handler |
| Line:col | Maps to source |
| Source maps | Translate transpiled → original |
| `Error.stackTraceLimit` (Node) | Default 10; increase if needed |

**Async stack traces — better than they used to be:**

| Property | Detail |
|---|---|
| `await` chains preserve trace | Modern engines |
| Promise rejection origin tracked | Chrome / Node |
| `.then()` chains | Sometimes lose context |
| Library-side helpers | `longjohn` (legacy), source maps |

**Common stack-related bugs:**

| Bug | Detail |
|---|---|
| Infinite recursion | Missing or wrong base case |
| Mutual recursion overflow | A→B→A→B... |
| Synchronous heavy loop | UI freezes |
| Blocking the event loop | No async ops can run |
| Catching all errors | Hides real bugs |
| Calling `.bind()` repeatedly in render | Re-creates function each call |
| Listening to scroll without throttle | Hot path |

**Tooling for inspection:**

| Tool | Use |
|---|---|
| **Chrome DevTools Performance** | Flame chart of call stack over time |
| **Node `--inspect`** | Attach Chrome DevTools |
| `console.trace()` | Print current stack |
| `Error().stack` | Capture programmatically |
| **`node --stack-size=N`** | Increase stack |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Tree recursion on big inputs | Overflow |
| Recursive Promise chains in microtask | Starves render (still single stack, but loops on microtasks) |
| `stackOverflow` masked by `try/catch` | Silent failure |
| Long sync `JSON.parse` on big payload | Frozen UI |
| Synchronous regex on huge string | Catastrophic backtracking blocks |
| Setting up listeners inside `forEach` | Each iteration adds frame |

**Cross-references:**

- Event loop ordering (microtasks vs macrotasks): [event_loop_*.md](../common_theory_prompts/event_loop_ordering.md)
- async/await + Promises: [async_await_*.md](async_await_promise_try_catch.md)
- Execution context + `this`: [execution_context_*.md](execution_context_global_function_this_scope_chain.md)
- Render pipeline (long tasks blocking it): [rendering_pipeline_*.md](../browser_architecture/rendering_pipeline_dom_cssom_layout_paint_composite.md)

**Rule of thumb:** **One stack, one thing at a time.** Each function call pushes a frame, each return pops; **deep or unbounded recursion → `RangeError`**. JavaScript is **single-threaded** at the user-code level — long synchronous work freezes the UI. **Convert recursion to iteration** for big inputs (TCO is unreliable), **break long tasks** with `await` / `setTimeout(0)` / `requestIdleCallback`, and **use Web Workers** when you genuinely need parallelism.
