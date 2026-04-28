### JavaScript — Execution Context, `this`, Scope Chain

**Definition:** an **execution context** is the environment in which JS code runs — it holds the **variable environment**, the **lexical environment**, and the **`this` binding**. Each function call creates a new execution context, pushed onto the call stack.

**The three context types:**

| Context | When created | `this` binding |
|---|---|---|
| **Global** | Once at startup | `globalThis` (browser: `window`, Node: `global`) |
| **Function** | Each function call | Depends on call style |
| **Eval** | `eval(...)` | Inherited from caller (rare; avoid) |
| Module | First import | `undefined` (strict by default) |

**What's inside a context:**

| Slot | Holds |
|---|---|
| **Variable Environment** | `var` declarations |
| **Lexical Environment** | `let`, `const`, function declarations |
| **`this` binding** | The receiver (varies by call style) |
| Outer reference | Parent scope (closures) |
| Code | The function body to run |

**Scope chain — how variables resolve:**

```javascript
const x = 1;
function outer() {
  const y = 2;
  function inner() {
    const z = 3;
    console.log(x, y, z);   // walks up: inner → outer → global
  }
  inner();
}
outer();   // 1, 2, 3
```

| Step | Resolves where |
|---|---|
| 1 | Inner local |
| 2 | Outer function's local |
| 3 | Module-level / global |
| 4 | `globalThis` (last resort) |
| If still not found | `ReferenceError` |

**`var` vs `let` vs `const` — different environments:**

| Form | Scope | Hoisted? | TDZ | Re-bindable? |
|---|---|---|---|---|
| `var` | Function | **Yes (initialized to `undefined`)** | No | Yes |
| `let` | Block | Hoisted but **uninitialized** | Yes (TDZ) | Yes |
| `const` | Block | Hoisted but **uninitialized** | Yes | No |

**Hoisting demo:**

```javascript
console.log(a);   // undefined — var hoisted, initialized to undefined
var a = 1;

console.log(b);   // ReferenceError — let in TDZ
let b = 2;

foo();            // works — function declarations hoisted whole
function foo() { console.log("hi"); }

bar();            // TypeError: bar is not a function (hoisted as var = undefined)
var bar = function() { console.log("hi"); };
```

| Hoisted | Detail |
|---|---|
| `function foo() {}` | Whole declaration |
| `var x` | Identifier (= undefined) |
| `let x` / `const x` | Identifier in TDZ |
| Class declarations | TDZ |
| Function expressions | Not hoisted |

**`this` — six call patterns:**

| Call | `this` |
|---|---|
| `obj.method()` | `obj` |
| `fn()` (loose call) | strict: `undefined`; sloppy: `globalThis` |
| `fn.call(ctx, ...args)` | `ctx` |
| `fn.apply(ctx, [...args])` | `ctx` |
| `fn.bind(ctx)()` | `ctx` (permanent) |
| `new Cls()` | New instance |
| Arrow function | **Lexical `this`** (parent context's) |
| DOM event handler | The element |
| Class method | The instance (via call site) |

**The arrow-function difference:**

```javascript
const obj = {
  data: [1, 2, 3],
  doubleAll() {
    // ❌ regular function: this is undefined inside callback
    return this.data.map(function(x) { return x * 2; });
  },
  doubleAllArrow() {
    // ✅ arrow inherits this from doubleAllArrow
    return this.data.map(x => x * 2);
  }
};
```

| Type | `this` source |
|---|---|
| Regular `function() {}` | Caller-determined |
| Arrow `() => {}` | **Lexical** — from where it was defined |
| Method shorthand `{ foo() {} }` | Caller (regular function) |

**Closures — captured environments:**

```javascript
function makeCounter() {
  let count = 0;
  return {
    inc:  () => ++count,
    get:  () => count,
  };
}

const c = makeCounter();
c.inc(); c.inc();
c.get();   // 2
```

| Property | Detail |
|---|---|
| Inner function captures outer's bindings | By reference, not by copy |
| Outer scope persists as long as inner refs it | GC-aware |
| Common gotcha | `var` in for-loops captures one binding |
| `let` in for-loops captures per-iteration | Modern fix |

**Loop closure trap:**

```javascript
// ❌ Old `var` bug
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints 3, 3, 3 — all callbacks share the same `i`

// ✅ `let` creates a new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints 0, 1, 2
```

**Strict mode (`"use strict"` or modules):**

| Behavior | Sloppy mode | Strict mode |
|---|---|---|
| `this` in loose `fn()` | `globalThis` | `undefined` |
| Implicit globals | Allowed | `ReferenceError` |
| `delete` non-configurable | Silent fail | `TypeError` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| `eval` introduces vars | Yes | No (own scope) |
| `with` statement | Allowed | `SyntaxError` |
| Modules | Always strict | n/a |

**`globalThis` (cross-runtime):**

| Runtime | Global object |
|---|---|
| Browser | `window` |
| Web Worker | `self` |
| Node.js | `global` |
| ES2020+ | **`globalThis` (everywhere)** |

**Function declarations vs expressions:**

```javascript
foo();   // works — declaration hoisted
function foo() { ... }

bar();   // TypeError — bar is undefined
var bar = function() { ... };

// Named function expression — name visible inside only
const baz = function inner() { console.log(typeof inner); };
baz();      // "function"
inner;      // ReferenceError
```

**Decision matrix:**

| Need | Use |
|---|---|
| Local block-scoped binding | `let` |
| Block-scoped, never re-bound | `const` |
| Function-scoped (legacy) | `var` (rarely necessary now) |
| Method that uses caller's `this` | Regular function |
| Callback that should see enclosing `this` | Arrow |
| Permanent `this` binding | `fn.bind(ctx)` |
| Closure to retain state | Function returning functions / object |
| Module-level state | `const x = ...` at top of module |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Calling method without receiver: `const f = obj.m; f()` | Loses `this` |
| Arrow methods on classes (intentional, but counter-intuitive) | Bound to instance |
| `var` leaking out of `if` / `for` block | Function scope, not block |
| `let` accessed before declaration | TDZ ReferenceError |
| Confusing `this` in callbacks | Use arrow or `bind` |
| Implicit globals in non-strict | Pollutes `window` |
| Reading variable from nested closure expecting copy | It's by reference |
| `const` array/object thinking it's deep-immutable | Only the binding is constant |

**Useful inspection:**

| Tool | Use |
|---|---|
| `console.log(this)` | Quick check |
| DevTools "Pause on exception" | Inspect stack at fault |
| Closure inspection in DevTools | Variables in scope chain |
| `Function.prototype.toString` | Source of function |
| TypeScript types | Catches `this`-binding bugs |

**Cross-references:**

- Call stack + LIFO: [call_stack_*.md](call_stack_lifo_frame_overflow_execution.md)
- Async/await + Promises: [async_await_*.md](async_await_promise_try_catch.md)
- Event loop ordering: [event_loop_*.md](../common_theory_prompts/event_loop_ordering.md)

**Rule of thumb:** **Each function call creates a new context with its own `this`, scope chain, and bindings.** `this` depends on **how** the function is called, not where it's defined — except for **arrow functions**, which capture lexically. Default to **`const`** then **`let`**; treat **`var`** as legacy. Prefer **strict mode** (modules are strict by default) and use **`globalThis`** when you actually need the global.
