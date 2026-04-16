### Rails Authorization: Pundit (Policy-Based)

```ruby
# Gemfile
gem 'pundit'

# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Pundit::Authorization
  after_action :verify_authorized  # ensure authorize! was called
  rescue_from Pundit::NotAuthorizedError, with: :forbidden

  private
  def forbidden
    render json: { error: "Forbidden" }, status: :forbidden
  end
end

# app/policies/post_policy.rb
class PostPolicy < ApplicationPolicy
  def show?    = true
  def create?  = user.present?
  def update?  = user.admin? || record.user == user
  def destroy? = user.admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      user.admin? ? scope.all : scope.where(published: true)
    end
  end
end

# Controller
def show
  @post = Post.find(params[:id])
  authorize @post  # raises if not allowed
end

def index
  @posts = policy_scope(Post)  # applies Scope
end

# View
<% if policy(@post).update? %>
  <%= link_to "Edit", edit_post_path(@post) %>
<% end %>
```

**Rule of thumb:** One policy per model. `authorize` in every controller action. `policy_scope` for listing. Test policies directly (plain Ruby classes). Preferred over CanCanCan for new projects.
