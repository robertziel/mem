### Authorization: Pundit & CanCanCan

**Authentication vs Authorization:**
- **Authentication** = WHO are you? (Devise, login)
- **Authorization** = WHAT can you do? (Pundit/CanCanCan, permissions)

**Pundit (policy-based, recommended):**
```ruby
# Gemfile
gem 'pundit'

# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Pundit::Authorization
  after_action :verify_authorized  # ensure authorize! was called
end
```

**Policy class:**
```ruby
# app/policies/post_policy.rb
class PostPolicy < ApplicationPolicy
  def show?
    true  # anyone can view
  end

  def create?
    user.present?  # logged-in users can create
  end

  def update?
    user.admin? || record.user == user  # admin or author
  end

  def destroy?
    user.admin?  # only admins can delete
  end

  # Scope: which records can this user see?
  class Scope < ApplicationPolicy::Scope
    def resolve
      if user.admin?
        scope.all
      else
        scope.where(published: true).or(scope.where(user: user))
      end
    end
  end
end
```

**Using in controller:**
```ruby
class PostsController < ApplicationController
  def index
    @posts = policy_scope(Post)           # applies PostPolicy::Scope
  end

  def show
    @post = Post.find(params[:id])
    authorize @post                        # raises Pundit::NotAuthorizedError if denied
  end

  def update
    @post = Post.find(params[:id])
    authorize @post
    @post.update!(post_params)
  end
end
```

**Handling unauthorized:**
```ruby
class ApplicationController < ActionController::Base
  rescue_from Pundit::NotAuthorizedError, with: :forbidden

  private

  def forbidden
    render json: { error: "You are not authorized" }, status: :forbidden
  end
end
```

**In views:**
```erb
<% if policy(@post).update? %>
  <%= link_to "Edit", edit_post_path(@post) %>
<% end %>

<% if policy(Post).create? %>
  <%= link_to "New Post", new_post_path %>
<% end %>
```

**CanCanCan (ability-based, alternative):**
```ruby
# Gemfile
gem 'cancancan'

# app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= User.new  # guest user

    can :read, Post, published: true

    if user.persisted?
      can :create, Post
      can [:update, :destroy], Post, user_id: user.id
    end

    if user.admin?
      can :manage, :all  # admin can do everything
    end
  end
end

# Controller
class PostsController < ApplicationController
  load_and_authorize_resource  # auto-loads @post and checks authorization

  def index
    # @posts already filtered by ability
  end

  def update
    # @post already loaded and authorized
    @post.update!(post_params)
  end
end
```

**Pundit vs CanCanCan:**
| Feature | Pundit | CanCanCan |
|---------|--------|-----------|
| Pattern | Policy per model | Central Ability class |
| Scaling | Better for large apps (separate files) | Gets messy with many rules |
| Testing | Easy (plain Ruby classes) | Harder (one big class) |
| Learning curve | Simpler concepts | More "magic" |
| Community | More popular (new projects) | Legacy, still maintained |

**Rule of thumb:** Use Pundit for new projects (cleaner, scales better). Policy per model keeps authorization logic organized. Always use `after_action :verify_authorized` to catch missing checks. Test policies directly (they're plain Ruby classes). Authorization should be server-side, never just in views.
