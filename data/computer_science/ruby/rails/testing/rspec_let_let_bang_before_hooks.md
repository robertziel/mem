### RSpec let, let!, and before Hooks

**let vs let! vs before:**
```ruby
let(:user) { create(:user) }     # lazy — created when first referenced
let!(:user) { create(:user) }    # eager — created before each test
before { @user = create(:user) } # eager — instance variable, less preferred

# let is memoized per example (not shared between tests)
# let! forces creation even if not referenced (useful for DB state)
```

**When to use which:**
```ruby
# Use let (lazy) when:
# - The test references the variable directly
# - You want to avoid unnecessary DB hits
let(:user) { create(:user) }

it "returns the user name" do
  expect(user.name).to eq("John")  # user created here, on first reference
end

# Use let! (eager) when:
# - DB state must exist before the test runs
# - The variable is not directly referenced but must be present
let!(:existing_post) { create(:post) }

it "returns all posts" do
  # existing_post was already created before this line
  expect(Post.count).to eq(1)
end

# Use before when:
# - You need side effects (setup that doesn't return a value)
# - You need to call methods, not just create objects
before { sign_in(user) }
```

**subject:**
```ruby
RSpec.describe User do
  subject { described_class.new(name: "Alice") }

  it { is_expected.to be_valid }                    # implicit subject
  it { is_expected.to validate_presence_of(:name) } # shoulda-matchers

  # Named subject
  subject(:admin) { create(:user, role: :admin) }
  it { expect(admin.admin?).to be true }
end
```

**Rule of thumb:** Use `let` for lazy setup (default choice), `let!` when DB state must exist before the test runs, and `before` for side effects like signing in. Prefer `let` over instance variables — it is memoized per example and makes dependencies explicit.
