### FactoryBot: create vs build vs build_stubbed

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

**Avoiding slow factories:**
```ruby
# BAD: every post creates a user, every comment creates a user + post
create_list(:comment, 100)  # 100 comments + 100 posts + 200 users!

# GOOD: share parent objects
user = create(:user)
post = create(:post, user: user)
create_list(:comment, 100, post: post, user: user)  # 100 comments, 1 post, 1 user
```

**Rule of thumb:** Use `build_stubbed` in unit tests (fastest). Use `build` when you need an unsaved object with nil ID. Use `create` only when DB state is needed. Use `attributes_for` when you need a params hash for controller tests. Share parent objects to avoid N+1 factory creation.
