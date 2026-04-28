### Explicit vs Implicit (Meaning + Testing)

**Definitions:**

| Term | Means |
|---|---|
| **Explicit** | Stated directly and clearly |
| **Implicit** | Not stated; understood from context or inference |

**Everyday example:**

| Form | Sentence |
|---|---|
| Explicit | "Close the window." |
| Implicit | "It's cold in here." |

**In code & testing:**

| Concern | Explicit | Implicit |
|---|---|---|
| **Test coverage** | Test directly targets a class / method | Broader test happens to exercise the path |
| **Behavior contract** | Documented + asserted | Side-effect assumed by callers |
| **Configuration** | Named, validated keys | Magic env-var lookups |
| **Type expectations** | Type annotations / schema | Duck-typed assumptions |
| **Error handling** | Caught with named exception | "It just won't fail" |
| **Naming** | `is_admin?` | `power_user?` |
| **API contract** | OpenAPI schema | "It returns whatever ActiveRecord serializes" |
| **Dependencies** | Constructor injection | Global / module lookup |

**Test examples:**

```ruby
# Explicit — directly tests the behavior
it "returns true for admin users" do
  expect(admin?(user)).to eq(true)
end

# Implicit — coverage happens accidentally inside an end-to-end test
it "works for dashboard access" do
  sign_in(user); get :show
  expect(response).to be_successful
end
```

> If `admin?` only gets exercised inside the dashboard test, removing the dashboard test silently drops coverage of `admin?`.

**Why explicit usually wins:**

| Win | Why |
|---|---|
| Easier to understand | Reader sees what's being tested at a glance |
| Easier to maintain | Map between test and code is 1:1 |
| Less accidental coverage | Refactors don't quietly drop test signal |
| Better failure messages | "admin? returned false" beats "dashboard 500ed" |
| Faster | Unit-level tests run in milliseconds |
| Safer to refactor | Targeted tests pin specific contracts |

**When implicit is fine:**

| Case | Detail |
|---|---|
| End-to-end / integration tests by design | Cover whole flows |
| Smoke tests in production | Confirm something works at all |
| Property-based tests | Many implicit cases automatically |
| Generated test data | Implicit by construction |

**Smell test for "is this implicit?":**

| Question | If yes → likely implicit |
|---|---|
| "Where in the code is this behavior asserted?" — no obvious test | ✅ |
| "If I delete this method, what fails?" — only some end-to-end test | ✅ |
| "Reading the test name, do I know what's tested?" — no | ✅ |
| "Does this test break if I refactor unrelated code?" — yes | ✅ |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| 100% explicit unit tests, no integration | Components work alone, fail together |
| 100% end-to-end, no unit | Slow, brittle, hard-to-isolate failures |
| Test naming that obscures intent ("works correctly") | Implicit-by-naming |
| Mocks that hide real contract | Implicit on the real path |
| Configuration via environment magic | Implicit dependencies |

**Rule of thumb:** **prefer explicit** — for tests, contracts, configuration, and behavior. If a reader has to **guess** what's being tested or required, it's probably implicit. Mix is fine: **explicit unit tests + a small set of integration tests** is the practical baseline.
