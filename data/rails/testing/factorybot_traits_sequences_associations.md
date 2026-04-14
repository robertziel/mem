### FactoryBot: Traits, Sequences & Associations

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

**Linting factories (CI check):**
```ruby
# spec/factories_spec.rb or as a rake task
RSpec.describe "FactoryBot" do
  it "has valid factories" do
    FactoryBot.lint  # creates every factory, checks validity
  end
end
```

**Rule of thumb:** Use traits for variations, not separate factories. Use sequences for unique attributes (email, username). Use transient attributes to control after-create callbacks. Run `FactoryBot.lint` in CI to catch broken factories early. Share parent objects in tests to avoid slow N+1 factory creation.
