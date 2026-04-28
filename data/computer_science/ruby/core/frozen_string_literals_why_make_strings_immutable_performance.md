### Ruby — Frozen String Literals

**Definition:** the **`# frozen_string_literal: true`** magic comment makes every string literal in a file **immutable + interned**. Same literal in different places is the same object — fewer allocations, no accidental mutation, cheaper Hash keys.

**Effects in one table:**

| Property | Without comment | With `# frozen_string_literal: true` |
|---|---|---|
| `"foo".frozen?` | false | **true** |
| Two literals same content | Different objects | **Same object** |
| `"foo" << "bar"` | mutates | **`FrozenError`** |
| Memory per N copies | N strings | 1 string |
| Hash key allocation | New string each lookup | Reused interned string |
| GC pressure | Higher | Lower |

**The magic comment goes at the top of the file:**

```ruby
# frozen_string_literal: true

class Order
  STATES = ["placed", "paid", "shipped"]   # all literals frozen + shared
end

Order::STATES.first << "!"   # FrozenError
```

| Position | Detail |
|---|---|
| Must be on **first** or **second** line | After shebang `#!/usr/bin/env ruby` if present |
| Must be a comment, not a string | `# frozen_string_literal: true` |
| File-scoped | One file at a time |
| Whole-codebase via Rubocop / `--enable-frozen-string-literal` | Default in many style guides |

**Why it improves performance:**

| Mechanism | Effect |
|---|---|
| String literal pool | Shared across allocations |
| Less object churn | Less GC work |
| `String#hash` cached on frozen strings | Hash key lookup faster |
| `==` check often falls through to identity | Pointer compare wins |
| Mutex constants, dispatch tables | One object, many references |

**Demonstrating identity:**

```ruby
# Without frozen literals:
"hello".object_id == "hello".object_id   # false — two allocations

# With frozen literals:
"hello".object_id == "hello".object_id   # true — same interned object
```

**What's still mutable:**

| Form | Frozen? |
|---|---|
| `"plain literal"` | ✅ frozen |
| `"interpolated #{x}"` | **❌ not** frozen — new string per call |
| `String.new("explicit")` | ❌ not frozen |
| `"foo".dup` | ❌ not frozen — defensive copy |
| `+"foo"` (Ruby 2.3+) | ❌ not frozen — explicit unfreeze |
| `"foo".freeze` (in unfrozen file) | ✅ frozen at this point |

> Use `+"foo"` when you specifically need a mutable copy in a frozen-literal file.

**When to avoid mutation patterns:**

```ruby
# ❌ Mutation in place:
buffer = ""
items.each { |i| buffer << i.name }   # FrozenError

# ✅ Use builder pattern:
buffer = String.new            # explicit mutable
items.each { |i| buffer << i.name }

# ✅ Or build with collect / join:
items.map(&:name).join("")
```

**Common idioms that benefit:**

| Pattern | Benefit |
|---|---|
| Constants like `STATES = %w[placed paid shipped]` | Each element interned, one allocation |
| Hash keys in dispatch tables | Reused string keys |
| Format strings in logs / errors | Same template object |
| Module / class names in metaprogramming | Shared |
| Rails routes / serializer keys | Less GC |

**Rails / Ruby ecosystem stance:**

| Project | Stance |
|---|---|
| Rails 5+ | All Rails source files use frozen literals |
| Rubocop | Default cop enables it |
| Ruby 3.0+ | Roadmap discussed making it default; stayed opt-in |
| Most modern gems | Use the magic comment |

**Migration approach:**

| Step | Detail |
|---|---|
| 1 | Add `# frozen_string_literal: true` to one file |
| 2 | Run tests; fix any `FrozenError` |
| 3 | Replace mutations with builder / `String.new` |
| 4 | Roll out via Rubocop autocorrect: `Style/FrozenStringLiteralComment` |

**Bench example (rough):**

```
Without frozen literals (1M iterations, "key" lookup in hash):
  ~80M allocations, GC fires repeatedly

With frozen literals:
  ~few hundred allocations
  ~30% faster on hot paths
```

> Numbers vary. Real win is fewer allocations / more predictable GC, especially in long-running processes.

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting comment, mixing styles | Inconsistent behavior across files |
| `<<` on a constant string | `FrozenError` |
| Building strings with `+=` instead of builder | Allocates per concat |
| Mutating Rails I18n keys | Boom |
| Using `String.new("x")` thinking it's frozen | It's not |
| Interpolated string assumed frozen | Each call allocates a new one |
| Returning a literal then mutating it elsewhere | Frozen, raises |
| Calling `.freeze` after building | Works but adds noise; let the magic comment do it |

**Cross-references:**

- Symbols vs strings: [symbols_vs_strings.md](symbols_vs_strings.md)
- Equality methods: [equality_*.md](equality_eq_eql_equal_methods.md)
- Memoization pitfalls: [memoization_*.md](../performance/memoization_pitfalls_falsey_values_instance_variable.md)

**Rule of thumb:** **Add `# frozen_string_literal: true` to every file.** You get fewer allocations, less GC pressure, faster Hash lookups, and accidental mutation becomes a clear `FrozenError` instead of a silent bug. When you genuinely need a mutable string, use **`String.new`** or **`+"foo"`**. Build with **builder pattern** (`buf = String.new; buf << ...`) or **`map.join`**, never `+=` in tight loops.
