### FactoryBot Patterns

**Basic factory:**
```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { "John Doe" }
    email { Faker::Internet.unique.email }
    password { "password123" }
    role { "viewer" }
    created_at { Time.current }
  end
end

# Usage
build(:user)              # in-memory, no DB hit
create(:user)             # saves to DB
build_stubbed(:user)      # in-memory, with fake ID, no DB hit (fastest)
attributes_for(:user)     # returns hash (for controller params)
```

**create vs build vs build_stubbed:**
| Method | DB hit | Has ID | Associations saved | Speed |
|--------|--------|--------|-------------------|-------|
| `create` | Yes | Real | Yes | Slowest |
| `build` | No | Nil | No | Fast |
| `build_stubbed` | No | Fake | Stubbed | Fastest |

**Traits (composable variations):**
```ruby
factory :user do
  name { "John Doe" }
  email { Faker::Internet.unique.email }
  role { "viewer" }

  trait :admin do
    role { "admin" }
  end

  trait :with_posts do
    after(:create) do |user|
      create_list(:post, 3, user: user)
    end
  end

  trait :banned do
    banned_at { 1.day.ago }
  end
end

# Combine traits
create(:user, :admin)                  # admin user
create(:user, :admin, :with_posts)     # admin with 3 posts
create(:user, :banned, name: "Alice")  # banned user named Alice
```

**Sequences (unique values):**
```ruby
factory :user do
  sequence(:email) { |n| "user#{n}@example.com" }
  sequence(:username) { |n| "user_#{n}" }
end
# user1@example.com, user2@example.com, ...
```

**Transient attributes (pass data without saving):**
```ruby
factory :user do
  transient do
    posts_count { 0 }
    with_avatar { false }
  end

  after(:create) do |user, evaluator|
    create_list(:post, evaluator.posts_count, user: user) if evaluator.posts_count > 0
    user.avatar.attach(fixture_file_upload("avatar.png")) if evaluator.with_avatar
  end
end

create(:user, posts_count: 5, with_avatar: true)
```

**Association handling:**
```ruby
factory :post do
  title { "My Post" }
  user  # auto-creates associated user (implicit association)
  # or explicit:
  association :user, factory: :user, strategy: :build
end

factory :comment do
  body { "Nice post!" }
  user
  post
end
```

**create_list:**
```ruby
users = create_list(:user, 5)           # 5 users
admins = create_list(:user, 3, :admin)  # 3 admin users
```

**Avoiding slow factories:**
```ruby
# BAD: every post creates a user, every comment creates a user + post
create_list(:comment, 100)  # 100 comments + 100 posts + 200 users!

# GOOD: share parent objects
user = create(:user)
post = create(:post, user: user)
create_list(:comment, 100, post: post, user: user)  # 100 comments, 1 post, 1 user
```

**Linting factories (CI check):**
```ruby
# spec/factories_spec.rb or as a rake task
RSpec.describe "FactoryBot" do
  it "has valid factories" do
    FactoryBot.lint  # creates every factory, checks validity
  end
end
```

**Rule of thumb:** Use `build_stubbed` in unit tests (fastest). Use `create` only when DB state is needed. Use traits for variations, not separate factories. Share parent objects to avoid slow test suites. Run `FactoryBot.lint` in CI to catch broken factories.
