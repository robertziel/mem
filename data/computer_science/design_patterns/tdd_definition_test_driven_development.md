### Definition

Short explanation: TDD (Test-Driven Development) is a workflow where you define behavior in tests first, then implement only what’s needed to pass.

In short:

Write a test that describes a small piece of desired behavior (it fails).

Write the simplest code to make the test pass.

Refactor the code while keeping all tests passing.

This cycle is often called Red → Green → Refactor.

### Why use TDD?

✔️ Fewer bugs

✔️ Cleaner, better-designed code

✔️ Safe refactoring

✔️ Tests double as documentation

### Tiny example

```ruby
# Red
it "adds two numbers" do
  expect(add(2, 3)).to eq(5)
end

# Green (simplest)
def add(a, b)
  a + b
end

# Refactor (if needed) — keep tests green
```

One-line summary:

“Define behavior with tests first, then implement only what’s needed.”
