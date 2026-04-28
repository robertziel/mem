### JavaScript — `async`/`await`, Promises, `try`/`catch`

**Definition:** **Promises** model future values; **`async`** makes a function return a Promise; **`await`** pauses inside an async function until a Promise settles. **`try`/`catch`** is how you handle errors — same shape as sync code, but works because `await` rethrows rejections.

**Promise states:**

| State | Detail |
|---|---|
| **Pending** | Started, no result yet |
| **Fulfilled** | Resolved with a value |
| **Rejected** | Failed with a reason |
| **Settled** | Either fulfilled or rejected |
| Once settled | Cannot change state |

**Three syntaxes for the same thing:**

| Form | Style |
|---|---|
| `.then().catch()` | Promise chain |
| `async`/`await` + `try`/`catch` | Sync-looking |
| Callbacks (legacy) | `(err, result)` style |

**Side-by-side:**

```javascript
// Promise chain
function load() {
  return fetch("/api/users")
    .then(r => r.json())
    .then(users => users.filter(u => u.active))
    .catch(err => { console.error(err); return []; });
}

// async/await — same logic, sync-looking
async function load() {
  try {
    const r = await fetch("/api/users");
    const users = await r.json();
    return users.filter(u => u.active);
  } catch (err) {
    console.error(err);
    return [];
  }
}
```

| Property | `.then` chain | `async`/`await` |
|---|---|---|
| Readability | OK for short chains | Better for branching |
| Stack traces | Worse | Better |
| Loops with awaits | Awkward | Natural |
| Conditional flow | Verbose | Native if/else |
| Concurrent fan-out | `Promise.all([...])` | `await Promise.all([...])` |

**Errors propagate:**

```javascript
// Rejection becomes thrown error inside await
async function getUser() {
  const r = await fetch("/api/user");      // network error → throws
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

// Caller can use try/catch:
try {
  const user = await getUser();
} catch (e) {
  alert(e.message);
}
```

| Mechanism | Detail |
|---|---|
| Promise rejected | `await` rethrows |
| Sync throw inside async | Becomes Promise rejection |
| Unhandled rejection | Logs warning; eventually crashes Node process |
| `process.on('unhandledRejection')` (Node) | Catch globally |
| `window.addEventListener('unhandledrejection')` (browser) | Catch globally |

**Concurrency primitives:**

| API | Behavior |
|---|---|
| `Promise.all([a, b])` | Resolve all; reject on first failure |
| `Promise.allSettled([a, b])` | Wait for all; report each result |
| `Promise.race([a, b])` | Resolve with first to settle (any state) |
| `Promise.any([a, b])` | Resolve with first to **fulfill**; reject only if all reject |

**Run in parallel — the common gotcha:**

```javascript
// ❌ SERIAL — each await blocks the next
async function loadAll() {
  const a = await fetchA();
  const b = await fetchB();
  const c = await fetchC();
  return { a, b, c };
}

// ✅ PARALLEL
async function loadAll() {
  const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
  return { a, b, c };
}
```

| Need | Pattern |
|---|---|
| Independent fetches | `Promise.all` |
| Need partial results even with failures | `Promise.allSettled` |
| Fastest of several mirrors | `Promise.any` |
| Race vs timeout | `Promise.race([call(), timeout(5000)])` |
| Limit concurrency | `p-limit` library or chunked loops |

**`for...of` + `await` — sequential by design:**

```javascript
// Process one at a time (serial)
for (const url of urls) {
  await fetch(url);
}

// Process all in parallel
await Promise.all(urls.map(url => fetch(url)));

// Process N at a time
import pLimit from "p-limit";
const limit = pLimit(5);
await Promise.all(urls.map(url => limit(() => fetch(url))));
```

| Pattern | Use |
|---|---|
| `for await` (over `AsyncIterable`) | Streams |
| Plain `for...of` + `await` | Serial |
| `Promise.all + map` | Parallel |
| `p-limit` / chunked | Bounded concurrency |
| `Array.prototype.forEach` + async | **Bug** — forEach doesn't await |

**`forEach` doesn't wait — common bug:**

```javascript
// ❌ Outer "done" logs before any fetch completes
[1, 2, 3].forEach(async n => {
  await fetch(n);
});
console.log("done");

// ✅ Use map + Promise.all
await Promise.all([1, 2, 3].map(n => fetch(n)));
console.log("done");
```

**Cancellation — `AbortController`:**

```javascript
const ctrl = new AbortController();
const timeoutId = setTimeout(() => ctrl.abort(), 5000);

try {
  const r = await fetch("/api/slow", { signal: ctrl.signal });
  clearTimeout(timeoutId);
  return r.json();
} catch (e) {
  if (e.name === "AbortError") console.log("timeout");
  else throw e;
}
```

| API | Use |
|---|---|
| `AbortController` | Native cancellation |
| `signal.aborted` | Check state |
| `signal.addEventListener('abort', fn)` | React to abort |
| `AbortSignal.timeout(ms)` (modern) | Auto-abort after ms |

**Timing semantics:**

| Action | When it runs |
|---|---|
| Code before first `await` | Synchronously |
| `await null` | Resumes in next microtask |
| `await Promise.resolve()` | Same microtask cycle |
| `await fetch(...)` | After network completes (macrotask + microtask) |

**Patterns and idioms:**

```javascript
// Retry with backoff
async function retry(fn, attempts = 3, delay = 200) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, delay * 2 ** i));
    }
  }
}

// Memoize a Promise
const cache = new Map();
function getUser(id) {
  if (!cache.has(id)) cache.set(id, fetch(`/u/${id}`).then(r => r.json()));
  return cache.get(id);
}

// Promisify a callback API
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Top-level `await`:**

| Environment | Supported? |
|---|---|
| ES modules (`<script type="module">`) | **Yes** |
| Top-level `<script>` | No |
| Node.js with `.mjs` / `"type": "module"` | Yes |
| CommonJS | No |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgot `await` | Get a Promise, not the value |
| Using `await` in `forEach` | Doesn't sequence |
| Sequential awaits when parallel possible | Slow |
| `try`/`catch` only at outermost layer | Lost stack traces |
| Returning `await x` is fine — but `return x` works too | Style preference |
| Catching every error broadly | Swallows bugs |
| Ignoring `Promise` returned by async function | Unhandled rejection later |
| `Promise.all` rejects on first failure | Use `allSettled` if you want partial |
| Closing over loop var with `var` | Stale; use `let` / `const` |

**`.then(onResolve, onReject)` vs `.catch`:**

```javascript
promise.then(handle, errorHandler);   // catches errors of `promise` only
promise.then(handle).catch(errorHandler);   // also catches errors thrown in `handle`
```

> Almost always use `.then(handle).catch(errorHandler)`.

**Cross-references:**

- Event loop ordering (microtasks): [event_loop_*.md](../common_theory_prompts/event_loop_ordering.md)
- React useEffect (often async): [useeffect_*.md](../react/useeffect_react_side_effect_cleanup_dependencies.md)
- Concurrency / I/O blocking: [concurrency_io_*.md](../../os_cs_fundamentals/concurrency_io_blocking_beam_processes.md)

**Rule of thumb:** **Use `async`/`await` + `try`/`catch` for readable async code.** Reach for **`Promise.all`** when fetches are independent (don't `await` them in series unless they truly depend). Use **`AbortController`** for cancellation/timeouts. **`forEach` doesn't `await`** — use `for...of` (serial) or `Promise.all(map(...))` (parallel). Always handle rejections — unhandled ones crash Node and warn in browsers.
