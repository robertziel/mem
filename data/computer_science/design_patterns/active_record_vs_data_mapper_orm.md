### Active Record vs Data Mapper Pattern

**Active Record (Rails, Django, Eloquent):**
- Model class = database table
- Instance = row
- Model contains persistence logic (save, find, validate)

```ruby
# Active Record: model IS the database
class User < ApplicationRecord
  validates :email, presence: true
  has_many :posts

  def activate!
    update!(active: true, activated_at: Time.current)
  end
end

user = User.find(1)
user.name = "Alice"
user.save!
```

**Data Mapper (Hibernate, Ecto, TypeORM):**
- Domain model is separate from persistence
- A mapper handles loading/saving
- Model has no knowledge of the database

```ruby
# Domain model: pure Ruby, no database knowledge
class User
  attr_accessor :id, :name, :email, :active
end

# Mapper handles persistence
class UserMapper
  def find(id)
    row = db.query("SELECT * FROM users WHERE id = ?", id)
    User.new.tap { |u| u.id = row[:id]; u.name = row[:name] }
  end

  def save(user)
    db.execute("UPDATE users SET name = ? WHERE id = ?", user.name, user.id)
  end
end
```

| Feature | Active Record | Data Mapper |
|---------|--------------|-------------|
| Simplicity | Easier (one class) | More code (model + mapper) |
| Testing | Needs database | Pure unit tests possible |
| Coupling | Tightly coupled to DB | Decoupled |
| Complex domain | Model gets bloated | Clean separation |
| Best for | CRUD apps, Rails | Complex domains, DDD |

**Rule of thumb:** Active Record for most Rails apps (simple, productive). Data Mapper when domain logic is complex and you want to test without a database. Rails uses Active Record by default; Elixir's Ecto uses Data Mapper.
