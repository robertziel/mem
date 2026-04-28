### Test-Driven Development (TDD) — Definition & Workflow

**One-line definition:** define behavior in tests **first**, then write only the code needed to pass them.

**The Red → Green → Refactor cycle:**

| Phase | What you do | Goal |
|---|---|---|
| **🔴 Red** | Write a test for new behavior — it fails | The test specifies the requirement |
| **🟢 Green** | Write the **simplest** code to pass | Make the test pass; nothing more |
| **🔵 Refactor** | Improve structure while keeping tests green | Clean code without changing behavior |

> **Cycle length: minutes, not days.** A long red phase usually means you're testing too big a behavior.

**Tiny example:**

```ruby
# 🔴 Red — failing test
it "adds two numbers" do
  expect(add(2, 3)).to eq(5)
end

# 🟢 Green — simplest impl
def add(a, b) = a + b

# 🔵 Refactor — keep tests green
# (here, nothing to refactor)
```

**Why TDD — what each property buys:**

| Property | Detail |
|---|---|
| Fewer regressions | Every behavior has a paired test |
| Better-designed code | Code is shaped by how it's used (the test) |
| Safe refactoring | Tests pin behavior; you can restructure freely |
| Tests as documentation | New developers read tests to understand intent |
| Faster local feedback | Small unit tests run in milliseconds |
| Forced thinking before coding | The test forces you to specify the contract |

**Variants of TDD:**

| Variant | Detail |
|---|---|
| **Classic TDD** | Unit-level Red-Green-Refactor (Kent Beck) |
| **Behavior-Driven Development (BDD)** | Same flow, given/when/then framing (Cucumber, RSpec features) |
| **Outside-In TDD** | Start from a high-level acceptance test, drill down |
| **Inside-Out TDD** | Start from low-level units, compose upward |
| **ATDD (Acceptance TDD)** | Driven by customer-readable acceptance tests |
| **Property-based TDD** | Properties + generators (QuickCheck-style) |
| **TCR** ("Test && Commit \|\| Revert") | Aggressive variant — auto-revert on red |

**TDD vs other approaches:**

| Approach | Tests written | Trade-off |
|---|---|---|
| **TDD** | Before code | Discipline cost; design benefit |
| **Test-after** | After code | Easier; tests often miss edge cases |
| **No tests** | Never | Cheapest short-term; expensive long-term |
| **Type-driven** | Types up front | Compile-time; misses runtime contracts |
| **Spec-first** | Schema → code | API contracts; not behavior |

**Outside-in vs inside-out:**

| Style | Start | Strength |
|---|---|---|
| **Outside-in (London school)** | Acceptance test first; mock collaborators; drill down | User-driven, collaborative |
| **Inside-out (Detroit / Chicago school)** | Smallest unit, build up | Strong domain core |
| Mix in practice | Acceptance tests + unit-level Red-Green | Most teams |

**The three test sizes (in TDD context):**

| Size | Speed | Scope | Use |
|---|---|---|---|
| Unit | ms | Single function / class | Drive design — the TDD workhorse |
| Integration | seconds | Multiple components, real DB / external | Verify wiring |
| End-to-end | minutes | Whole system | Confirm flows; not for TDD cycle |

> TDD operates mostly at the **unit** level. Integration / E2E tests come at higher tiers.

**Common TDD mistakes:**

| Mistake | Effect |
|---|---|
| Writing the test **and the code** at the same time | Defeats the design pressure |
| Skipping refactor | Code rots; "dirty green" |
| Writing huge tests | Long red phases; no incremental progress |
| Testing implementation details (exact method calls) | Tests break on every refactor |
| Mocking everything | Tests pass; real wiring breaks |
| Skipping when "it's just a quick fix" | Quick fixes spawn quick bugs |
| Adding tests after to chase coverage | Defeats the design benefit |
| One assertion per test as dogma | Sometimes a behavior needs multiple assertions |
| Testing private methods | Hard to refactor; couples to internals |

**Anti-pattern: writing the test you can pass:**

> The test must be **meaningful and fail for the right reason** before you write the implementation. A test that passes immediately proves nothing.

**When TDD is most valuable:**

| Context | Why |
|---|---|
| Pure-logic / domain code | Easy to unit-test; design pressure pays off |
| Algorithms / parsers / state machines | Edge cases captured precisely |
| Refactoring legacy code | Tests pin behavior so changes are safe |
| Bug fixes | Write the failing test first → fix → permanent regression guard |
| Working in unfamiliar code | Tests act as a safety net |

**When TDD is harder (still possible, more friction):**

| Context | Friction |
|---|---|
| UI / visual layout | Pixel-perfect matching is brittle; use snapshot or visual tools |
| Heavy I/O / external integration | Mock too much → unrealistic; mock too little → slow |
| Spike / exploration | You don't know the design yet — explore first, TDD second |
| Performance-driven code | Need real workloads, not just behavior |
| Concurrency / distributed systems | Hard to express timing contracts in unit tests |

**Test naming — convey behavior, not implementation:**

| Bad | Good |
|---|---|
| `test_method_x` | `it "rejects invalid email format"` |
| `test_returns_true` | `it "returns true when admin and on team"` |
| `test_calls_save` | `it "persists the new user"` |
| `test_helper_function` | `it "formats currency with two decimal places"` |

> Read tests as documentation. The name should describe **what the system does**, not how.

**FIRST principles for unit tests:**

| Letter | Means |
|---|---|
| **F**ast | Milliseconds — run frequently |
| **I**solated | No shared state between tests |
| **R**epeatable | Same result every time, anywhere |
| **S**elf-validating | Pass / fail; no human inspection |
| **T**imely | Written just before / with the code |

**Test doubles spectrum:**

| Type | Detail |
|---|---|
| **Stub** | Returns fixed responses |
| **Mock** | Verifies expected interactions |
| **Spy** | Records calls; verifies after |
| **Fake** | Lightweight working implementation (in-memory DB) |
| **Dummy** | Placeholder; never used |

> Prefer **fakes** over **mocks** when possible — fakes test real wiring better.

**Coverage as a signal, not a goal:**

| Coverage % | Reading |
|---|---|
| 100% line coverage with no test of behavior | Quantity ≠ quality |
| 70–80% with focused unit + integration tests | Healthy for most projects |
| Branch coverage > line coverage | More meaningful |
| Mutation testing scores | Strongest measure |

> A test that runs the code but doesn't assert behavior shows up as covered but tests nothing. Watch for "assertion-free" tests.

**TDD workflow — daily rhythm:**

| Step | Detail |
|---|---|
| 1 | Pick the smallest piece of new behavior |
| 2 | Write a failing test for it |
| 3 | Run — confirm it fails for the **right reason** |
| 4 | Write the **simplest** code to pass |
| 5 | Run — confirm green |
| 6 | Refactor with tests as a safety net |
| 7 | Commit (small, focused) |
| 8 | Repeat |

**Cycle length:**

| Cycle | Means |
|---|---|
| **< 5 minutes** | Healthy |
| 5–15 minutes | Borderline; consider smaller behaviors |
| > 15 minutes red | Stop, simplify, or back out |

**Refactor phase — what to actually do:**

| Refactor | Detail |
|---|---|
| Extract method / function | Repeated logic |
| Rename | Better-fitting names |
| Inline | Unnecessary indirection |
| Move method | Belongs on another class |
| Replace conditional with polymorphism | Long if/else trees |
| Introduce parameter object | Long parameter lists |
| Tease apart unrelated behaviors | Single Responsibility |

**Tools by language:**

| Stack | Test framework |
|---|---|
| Ruby | RSpec, Minitest |
| Python | pytest, unittest |
| JavaScript / TypeScript | Vitest, Jest, Mocha |
| Java | JUnit 5, AssertJ, Mockito |
| Go | built-in `testing`, testify |
| Rust | built-in `#[test]`, proptest |
| .NET | xUnit, NUnit, FluentAssertions |
| C++ | Google Test, Catch2 |
| Mutation testing | mutmut (Py), Stryker (JS), PIT (Java) |

**Pair / mob TDD:**

| Pattern | Detail |
|---|---|
| **Ping-pong** | One writes the failing test, the other writes the code, swap |
| **Driver / navigator** | One types; the other guides |
| **Mob TDD** | Whole team, rotating typist every few minutes |

> Pair TDD often catches design issues much earlier — shared brains beat solo at the design moment.

**Common questions / interview answers:**

| Q | A |
|---|---|
| "Do you always TDD?" | "Where it pays — domain logic, bug fixes, refactors. Spikes / UI sometimes I write tests after I'm sure the shape is right." |
| "What if you can't predict the design?" | "Spike (no tests, no commit), throw it away, then TDD with what I learned." |
| "Don't tests slow you down?" | "Short-term yes; medium-term they replace much slower manual debugging and rework." |
| "How does TDD interact with code review?" | "Tests document the contract. Reviewers can read tests first to understand intent." |

**Rule of thumb:** **define behavior with tests first, then implement only what's needed.** **Red → Green → Refactor in cycles of minutes, not hours.** Tests describe **behavior**, not implementation. **Coverage is a signal, not a goal** — a green test that asserts nothing teaches nothing. TDD pays best on **logic, refactors, and bug fixes**; for spikes / UI, write tests when the shape stabilizes.
