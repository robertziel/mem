### Testing Levels — Unit / Functional / Integration / Contract / E2E

**Definition:** five levels of automated tests, distinguished by **scope and boundaries crossed**, not by speed or whether they hit the database. Each catches different bugs at different costs.

**The five levels:**

| Level | Scope | What it tests | Speed | Cost |
|---|---|---|---|---|
| **Unit** | One method / function | Logic in isolation | Fastest (ms) | Lowest |
| **Functional** | One component (controller, handler) | Behavior at a single boundary | Fast (10s of ms) | Low |
| **Integration** | Multiple components together | They cooperate correctly | Medium (100s of ms) | Medium |
| **Contract** | Service-to-service expectations | Inter-service compatibility | Medium | Medium |
| **E2E** | Full system, user-perspective | Real user journey works | Slowest (seconds) | Highest |

**The pyramid (and why it shapes well):**

```
                    ┌──────┐
                    │ E2E  │       few — slow, brittle, expensive
                  ┌─┴──────┴─┐
                  │ Contract │     some — protect service seams
                ┌─┴──────────┴─┐
                │ Integration  │   moderate — meaningful boundaries
              ┌─┴──────────────┴─┐
              │   Functional     │ many — controller / handler level
            ┌─┴───────────────────┴─┐
            │       Unit            │ most — logic in isolation
            └───────────────────────┘
```

**Common confusion — "DB access ≠ integration":**

| Test | Often classified as | Actually | Why |
|---|---|---|---|
| Model spec hitting DB | "Integration" | **Unit** (most cases) | One class; DB is implementation detail |
| Controller spec | "Integration" | **Functional** | One controller boundary |
| Multi-service test with HTTP | "Functional" | **Integration / E2E** | Crosses service boundary |
| Stubbed multi-controller test | "Integration" | **Functional** | Boundaries faked |

> **Boundary-crossing defines the level**, not "does it use the database."

**Unit tests:**

| Property | Detail |
|---|---|
| Test one class / function | Mock external dependencies if heavy |
| Many of them | Cheap to write and run |
| Fail fast on logic bugs | First line of defense |
| Should not depend on env | Run anywhere |
| Don't over-mock | Mock external services, not your own classes |

```ruby
# Rails model unit spec
RSpec.describe Money do
  it "adds amounts in same currency" do
    expect(Money.new(100, "USD") + Money.new(50, "USD")).to eq(Money.new(150, "USD"))
  end

  it "raises on currency mismatch" do
    expect { Money.new(100, "USD") + Money.new(50, "EUR") }.to raise_error(ArgumentError)
  end
end
```

**Functional tests:**

| Property | Detail |
|---|---|
| One boundary (controller, request handler) | Driven by HTTP / message |
| Real or test-double underlying components | Up to you |
| Verify response shape, status, side effects | Same as the contract the boundary owes |
| Rails: `request specs` are functional | They drive HTTP into the controller |

```ruby
RSpec.describe "GET /users/:id", type: :request do
  it "returns 200 with user JSON" do
    user = create(:user, name: "Alice")
    get "/users/#{user.id}"

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include("name" => "Alice")
  end
end
```

**Integration tests:**

| Property | Detail |
|---|---|
| Multiple internal components together | Several classes, not just one |
| Real DB, real cache, real queues if relevant | Or in-memory equivalents |
| Avoid external services | Stub HTTP for vendor APIs |
| Verify the components compose correctly | Where a unit + a unit = a workflow |

```ruby
RSpec.describe "Order placement workflow" do
  it "creates order, reserves inventory, sends email" do
    user = create(:user)
    product = create(:product, stock: 5)

    OrderPlacement.new(user: user, product: product).call

    expect(user.orders.count).to eq(1)
    expect(product.reload.stock).to eq(4)
    expect(ActionMailer::Base.deliveries.last.to).to eq([user.email])
  end
end
```

**Contract tests:**

| Property | Detail |
|---|---|
| Verify interaction between services | Producer + consumer agree on shape |
| Two-sided | Producer side: "I can serve this contract"; consumer side: "I depend on this contract" |
| Stored separately from each service | Versioned |
| Fail when contract drifts | Catches breaking changes in CI |

| Tool | Use |
|---|---|
| **Pact** | Most popular consumer-driven contract test |
| **Spring Cloud Contract** | JVM-focused |
| **OpenAPI + Schemathesis** | Spec-driven property tests |
| **Postman + Newman** | Lightweight |

```ruby
# Consumer side (Pact)
provider = MockService.new("billing")
provider.given("user 42 exists")
        .upon_receiving("a get for user 42")
        .with(method: :get, path: "/users/42")
        .will_respond_with(status: 200, body: { id: 42, plan: "pro" })

# Test runs against the mock; Pact files shipped to provider
```

**E2E tests:**

| Property | Detail |
|---|---|
| Whole system, including UI | Real browser, real DB, real services |
| User journey | Click → form → submit → result |
| Slowest, most brittle | Network, timing, DOM flakiness |
| Smallest count | Cover the critical golden paths |
| Tools | Capybara + Cuprite, Playwright, Cypress |

```ruby
RSpec.describe "User signup", type: :system, js: true do
  it "lets a user sign up and reach dashboard" do
    visit "/"
    click_link "Sign up"
    fill_in "Email", with: "alice@example.com"
    fill_in "Password", with: "secret123"
    click_button "Create account"

    expect(page).to have_content("Welcome, Alice")
    expect(page).to have_current_path("/dashboard")
  end
end
```

**Decision matrix — picking the right level:**

| Bug type | Best caught by |
|---|---|
| Off-by-one in pricing math | Unit |
| Wrong status code on bad input | Functional |
| Email not sent after order | Integration |
| API consumer breaks when field renamed | Contract |
| User can't actually sign up due to JS error | E2E |
| Race condition in workflow | Integration |
| Mocked dependency hides real behavior | Drop one level lower |

**Test-doubles vocabulary:**

| Term | Detail |
|---|---|
| **Stub** | Returns canned answer |
| **Mock** | Asserts how it was called |
| **Fake** | Working but simplified (e.g. in-memory DB) |
| **Spy** | Records calls without prescribing |
| **Dummy** | Placeholder, never used |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| 100% E2E coverage | Slow, brittle, hides unit bugs |
| Over-mocking unit tests | Tests pass; real code broken |
| Integration tests that mock everything | They're not integration tests |
| Contract tests treated as unit tests | Don't catch drift |
| Skipping unit tests because "we have E2E" | Slow feedback loop |
| Tests that only assert mocks were called | No behavior verification |
| Massive E2E suites that flake constantly | Disabled in CI, useless |
| Same test at multiple levels | Cost without coverage gain |

**Rails-specific notes:**

| Concept | Detail |
|---|---|
| **Model specs** | Usually unit (even if hitting DB) |
| **Request specs** | Functional |
| **System specs** | E2E (with `js: true` for browser) |
| **`describe` shapes** | One per class = unit; one per workflow = integration |
| **Factory bots** | Speed unit-test setup |
| **`use_transactional_tests`** | Roll back DB after each |
| **DatabaseCleaner** | When transactions don't fit (parallel JS specs) |

**Cost / coverage balance:**

| Level | % of suite (typical) | Run time (per test) |
|---|---|---|
| Unit | 60–70% | 1–10 ms |
| Functional | 15–20% | 10–100 ms |
| Integration | 10–15% | 100s ms – 1s |
| Contract | 1–5% | seconds |
| E2E | 1–5% | seconds – minutes |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Calling all DB-touching tests "integration" | Misleading scope |
| E2E for input validation | Should be unit |
| No contract tests between services | Breaking changes shipped silently |
| Large fixture files | Brittle, slow |
| Time-dependent assertions | Flake — use `Timecop` / `freeze_time` |
| Mocking your own classes | Tests mock instead of code |
| Slow CI from E2E-heavy suite | Inverted pyramid |

**Cross-references:**

- API contract tests + OpenAPI: [api_contracts_*.md](../../../api_design/contracts_pact_consumer_driven.md)
- Rails request lifecycle: [request_lifecycle_*.md](../activerecord/request_lifecycle_rack_router.md)
- CI/CD pipelines: [cicd_pipeline_*.md](../../../devops/cicd_pipeline_design.md)

**Rule of thumb:** **Boundaries define the level, not DB access.** Most tests are **unit** — one class, deterministic, fast. **Functional** for one boundary (controller / handler). **Integration** when meaningful boundaries cross. **Contract** to prevent service drift. **E2E** for the few critical user journeys. Keep the **pyramid shape**: most tests at the bottom, few at the top. Mocking your own code is usually a smell — drop a level instead.
