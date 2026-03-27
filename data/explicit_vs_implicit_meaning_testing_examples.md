### Explicit vs. Implicit (short)

- **Explicit** -> stated directly and clearly
- **Implicit** -> not stated directly; understood from context or inference

### Everyday example

- Explicit -> "Close the window."
- Implicit -> "It's cold in here."

The second sentence does not directly say "close the window," but that idea is implied.

### Testing context

- **Explicit test coverage** -> A test clearly targets a specific class or method.
- **Implicit test coverage** -> A broader test happens to cover the code path indirectly.

### Code examples

Explicit:

```ruby
it "returns true for admin users" do
  expect(admin?(user)).to eq(true)
end
```

This directly states the behavior being tested.

Implicit:

```ruby
it "works for dashboard access" do
  sign_in(user)
  get :show
  expect(response).to be_successful
end
```

If `admin?` is only being tested somewhere inside that full flow, the coverage is implicit.

### Why explicit is usually better

- Easier to understand
- Easier to maintain
- Easier to map tests to behavior
- Less accidental coverage

**Rule of thumb:** If a reader has to guess what is being tested or required, it is probably implicit.
