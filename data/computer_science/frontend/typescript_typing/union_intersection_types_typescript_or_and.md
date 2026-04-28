### TypeScript — Union (`|`) vs Intersection (`&`) Types

**Definition:** **Union** types (`A | B`) mean "either A or B" — you must narrow before using shape-specific properties. **Intersection** types (`A & B`) mean "both A and B at once" — combine the requirements. They're dual operations from set theory; **don't confuse them with `&&` / `||`**.

**Core comparison:**

| Operator | Meaning | Example | Set-theory |
|---|---|---|---|
| **`A \| B`** (union) | Value is **one of** these types | `string \| number` | Union of sets |
| **`A & B`** (intersection) | Value is **all of** these types simultaneously | `Person & Employee` | Intersection of sets |
| `A & never` | Impossible | Often a type bug | Empty set |
| `A \| never` | Same as `A` | `never` is identity for `\|` | A unchanged |

**Demo:**

```typescript
type Cat = { kind: "cat"; meows: number };
type Dog = { kind: "dog"; barks: number };

type Pet = Cat | Dog;                    // EITHER
type Hybrid = Cat & Dog;                  // BOTH

const p1: Pet = { kind: "cat", meows: 3 };           // ok — Cat
const p2: Pet = { kind: "dog", barks: 5 };           // ok — Dog
const h:  Hybrid = { kind: ???, meows: 1, barks: 1 };// kind impossible — Cat needs "cat", Dog needs "dog"
```

| Type | What you can read directly |
|---|---|
| `Pet` | Only common props (`kind`); to get `meows`/`barks` you must narrow |
| `Hybrid` | All props from both — but constructing one is often impossible |

**Discriminated unions (the killer feature):**

```typescript
type Result =
  | { ok: true;  data: string }
  | { ok: false; error: Error };

function handle(r: Result) {
  if (r.ok) {
    console.log(r.data);    // narrowed to success arm
  } else {
    console.log(r.error);   // narrowed to failure arm
  }
}
```

| Property | Detail |
|---|---|
| Each arm has a **literal discriminant** | `ok: true` vs `ok: false` |
| TS narrows by checking that field | `if (r.ok)` |
| Other props are inaccessible until narrowed | Type-safe |
| Common shapes | `kind`, `type`, `tag`, `_tag` |
| Most powerful TS pattern for state machines | Use it everywhere |

**Narrowing techniques:**

| Technique | Example |
|---|---|
| **Discriminant check** | `if (r.kind === "cat")` |
| **`typeof`** | `if (typeof x === "string")` |
| **`instanceof`** | `if (e instanceof Error)` |
| **`in` operator** | `if ("meows" in pet)` |
| **User-defined type guard** | `function isCat(p: Pet): p is Cat { return p.kind === "cat"; }` |
| **Truthiness** | `if (x)` narrows `T \| null \| undefined` to `T` |
| **`never` exhaustiveness** | `default: const _: never = x;` |

**Intersection use cases:**

```typescript
// Combine props (mixin-style)
type Identifiable = { id: string };
type Timestamped  = { createdAt: Date; updatedAt: Date };

type User = { name: string } & Identifiable & Timestamped;
// User has: name, id, createdAt, updatedAt

// Intersect with a literal to refine
type WithLoading<T> = T & { loading: boolean };

// Branded types
type UserId = string & { readonly _brand: "UserId" };
```

| Pattern | Detail |
|---|---|
| Mixin types | Combine multiple shapes |
| Refining a generic | Add fields without inheritance |
| Branded / nominal types | Distinguish types with same shape |
| Helper types | Building blocks |

**Function signatures and unions:**

```typescript
type Logger = (message: string) => void
            | ((message: string, level: "info" | "warn") => void);

// You can call it ONLY with the LEAST flexible signature in the union
// In practice — overloading is usually clearer
```

| Property | Detail |
|---|---|
| Union of function types is restrictive | Caller can't know which arm |
| Intersection of function types is overload-like | Must satisfy all signatures |
| Real overloads (function declarations) usually clearer | Use them for libraries |

**Distributive unions (a tricky behavior):**

```typescript
type Wrap<T> = T extends any ? { value: T } : never;

type X = Wrap<string | number>;
// = Wrap<string> | Wrap<number>
// = { value: string } | { value: number }   ← distributed!

// To prevent distribution:
type WrapNoDistribute<T> = [T] extends [any] ? { value: T } : never;
type Y = WrapNoDistribute<string | number>;
// = { value: string | number }
```

| Property | Detail |
|---|---|
| `T extends X` distributes over union when T is a naked type parameter | Per-arm transform |
| Wrap T in tuple `[T]` to disable | Hold as-is |
| Powerful for utility types | `Exclude`, `Extract`, `NonNullable` |

**Common utility types built on union/intersection:**

| Type | Definition | Effect |
|---|---|---|
| `NonNullable<T>` | `T extends null \| undefined ? never : T` | Removes null/undefined |
| `Exclude<T, U>` | `T extends U ? never : T` | Remove arms matching U |
| `Extract<T, U>` | `T extends U ? T : never` | Keep arms matching U |
| `Pick<T, K>` | Subset of properties | Project |
| `Omit<T, K>` | All but K | Remove fields |
| `Partial<T>` | All optional | For updates |
| `Required<T>` | All required | Inverse of Partial |
| `Readonly<T>` | All readonly | Immutable view |

**`keyof` and unions of keys:**

```typescript
type User = { id: string; name: string; email: string };
type UserKey = keyof User;             // "id" | "name" | "email"

function get<K extends UserKey>(u: User, key: K): User[K] {
  return u[key];
}
```

| Property | Detail |
|---|---|
| `keyof T` is a union of T's keys | String literals |
| Pairs nicely with mapped types | `{ [K in keyof T]: ... }` |
| Common in generic helpers | `pick`, `omit`, `get` |

**`never` — the empty type:**

| Property | Detail |
|---|---|
| Subtype of every type | `function fail(): never` (throws) |
| In unions | `T \| never` simplifies to `T` |
| In intersections | `T & never` is `never` (impossible) |
| Exhaustiveness check | `const _: never = x` errors if narrow incomplete |

**Exhaustiveness pattern:**

```typescript
function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.side ** 2;
    default:
      const _exhaustive: never = s;   // errors if you add a new kind without handling
      return _exhaustive;
  }
}
```

| Property | Detail |
|---|---|
| Add a new union arm without `case` | TS errors |
| Forces compile-time coverage | No runtime fallback needed |
| Pattern works for any discriminated union | Generalizable |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `A & B` thinking it's `A or B` | Backwards |
| Calling shape-specific prop on union | TS error: "doesn't exist on T" |
| Intersection of conflicting primitives | Becomes `never` |
| Forgetting `never` exhaustiveness | New union arms unhandled |
| `string & {}` to "force string narrowing" | Hack; modern TS doesn't need |
| Distributing when you didn't want to | Wrap in tuple |
| Union of function types | Restrictive, use overloads |
| Branded types lost across boundaries | Re-brand on each entry |

**Decision matrix:**

| Need | Pick |
|---|---|
| Value is one of several types | **Union (`\|`)** |
| Combine fields from multiple shapes | **Intersection (`&`)** |
| API result that's success-or-failure | Discriminated union |
| Extend a type without inheritance | Intersection |
| Narrow with type predicate | User-defined guard |
| Exhaustiveness check | `never` in `default:` |
| State machine | Discriminated union per state |

**Cross-references:**

- TypeScript generics: [generics_*.md](generics_typescript_constraints_inference_default.md)
- TypeScript narrowing: [narrowing_*.md](narrowing_typescript_typeof_in_instanceof_guards.md)
- Type vs interface: [type_vs_interface.md](type_vs_interface_typescript.md)

**Rule of thumb:** **Union (`\|`) means "one of these"; intersection (`&`) means "all at once".** Reach for **discriminated unions** with a literal `kind`/`type`/`tag` field — narrowing via `switch` is the most powerful TS pattern. Use intersection for **mixin-style combination** of shapes. Add a **`never` default** in switches for compile-time exhaustiveness checks. Wrap T in a tuple (`[T] extends [U]`) to prevent unwanted distribution over unions.
