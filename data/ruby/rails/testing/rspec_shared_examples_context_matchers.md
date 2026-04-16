### RSpec Shared Examples, Shared Context & Common Matchers

**Shared examples (DRY test patterns):**
```ruby
# Define
RSpec.shared_examples "a soft-deletable model" do
  it "sets deleted_at on destroy" do
    subject.destroy
    expect(subject.deleted_at).to be_present
  end

  it "is excluded from default scope" do
    subject.destroy
    expect(described_class.all).not_to include(subject)
  end
end

# Use
RSpec.describe Post do
  subject { create(:post) }
  it_behaves_like "a soft-deletable model"
end

RSpec.describe Comment do
  subject { create(:comment) }
  it_behaves_like "a soft-deletable model"
end
```

**Shared context:**
```ruby
RSpec.shared_context "authenticated user" do
  let(:current_user) { create(:user) }
  before { sign_in(current_user) }
end

RSpec.describe "Dashboard", type: :request do
  include_context "authenticated user"

  it "returns 200" do
    get "/dashboard"
    expect(response).to have_http_status(:ok)
  end
end
```

**Common matchers:**
```ruby
# Equality
expect(value).to eq(expected)          # ==
expect(value).to eql(expected)         # eql?
expect(value).to be(expected)          # equal? (same object)
expect(value).to be_truthy             # truthy
expect(value).to be_nil

# Comparison
expect(value).to be > 5
expect(value).to be_between(1, 10)

# Collections
expect(array).to include(1, 2)
expect(array).to contain_exactly(3, 1, 2)  # order doesn't matter
expect(array).to match_array([3, 1, 2])
expect(hash).to include(key: "value")

# Changes
expect { user.activate! }.to change(user, :active).from(false).to(true)
expect { post.destroy }.to change(Post, :count).by(-1)

# Errors
expect { dangerous_method }.to raise_error(ArgumentError, /message/)
expect { safe_method }.not_to raise_error

# shoulda-matchers (gem)
it { is_expected.to validate_presence_of(:email) }
it { is_expected.to have_many(:posts).dependent(:destroy) }
it { is_expected.to belong_to(:user) }
```

**Test organization:**
```
spec/
  models/         # unit tests for models
  requests/       # integration tests for API/controllers
  system/         # E2E with Capybara (browser)
  services/       # service objects
  jobs/           # background jobs
  mailers/        # mailer tests
  support/        # shared contexts, helpers
  factories/      # FactoryBot factories
```

**Rule of thumb:** Use shared examples to DRY test patterns across models that share behavior (soft-delete, auditing, slugging). Use shared context for common setup (authenticated user, admin context). Place shared examples and contexts in `spec/support/` and load them via `rails_helper.rb`. Keep matchers expressive — prefer `change`, `include`, and `contain_exactly` over manual value checks.
