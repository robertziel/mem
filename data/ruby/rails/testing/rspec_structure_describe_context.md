### RSpec Structure: describe, context, it

**Structure:**
```ruby
RSpec.describe User, type: :model do
  describe "#full_name" do          # instance method
    context "when first and last name present" do
      let(:user) { build(:user, first_name: "John", last_name: "Doe") }

      it "returns combined name" do
        expect(user.full_name).to eq("John Doe")
      end
    end

    context "when last name is blank" do
      let(:user) { build(:user, first_name: "John", last_name: nil) }

      it "returns first name only" do
        expect(user.full_name).to eq("John")
      end
    end
  end
end
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

**Rule of thumb:** Use `describe` for the class/method, `context` for scenarios (when/with/without), `it` for specific examples. Keep tests focused: one assertion per example when possible. Use `subject` for the object under test and `described_class` to reference the class being described.
