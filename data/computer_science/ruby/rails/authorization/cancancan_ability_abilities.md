### Rails Authorization: CanCanCan (Ability-Based)

```ruby
# Gemfile
gem 'cancancan'

# app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= User.new  # guest

    can :read, Post, published: true

    if user.persisted?
      can :create, Post
      can [:update, :destroy], Post, user_id: user.id
    end

    if user.admin?
      can :manage, :all  # everything
    end
  end
end

# Controller
class PostsController < ApplicationController
  load_and_authorize_resource  # auto-loads and checks

  def index
    # @posts already filtered by ability
  end
end
```

**Pundit vs CanCanCan:**
| Feature | Pundit | CanCanCan |
|---------|--------|-----------|
| Pattern | Policy per model | Central Ability class |
| Scaling | Better (separate files) | Gets messy with many rules |
| Testing | Easy (plain Ruby) | Harder (one big class) |
| Popularity | More popular (new projects) | Legacy, still maintained |

**Rule of thumb:** CanCanCan for existing projects already using it. Pundit for new projects (cleaner, scales better). Both work — pick one and be consistent.
