### MVC (Model-View-Controller)

Separate application into three concerns: data, presentation, and logic.

```
User Request → [Controller] → manipulates → [Model] (data + business logic)
                    ↓                            ↓
              selects view               provides data
                    ↓                            ↓
               [View] ← renders data from Model → Response to User
```

**In Rails:**
```ruby
# Model: data + validations + business logic
class Post < ApplicationRecord
  validates :title, presence: true
  scope :published, -> { where(published: true) }
end

# Controller: receives request, coordinates model + view
class PostsController < ApplicationController
  def index
    @posts = Post.published.order(created_at: :desc)
  end

  def create
    @post = Post.new(post_params)
    if @post.save
      redirect_to @post
    else
      render :new
    end
  end
end

# View: presents data (ERB, JSON, etc.)
# app/views/posts/index.html.erb
<% @posts.each do |post| %>
  <h2><%= post.title %></h2>
<% end %>
```

**MVC variants:**
| Variant | Used in |
|---------|---------|
| MVC | Rails, Django, Laravel |
| MVVM | SwiftUI, WPF, Vue.js |
| MVP | Android (older) |
| Flux/Redux | React |

**Rule of thumb:** MVC is the foundation of web frameworks. Keep controllers thin (delegate to services). Keep models focused on data and domain logic. Views should have minimal logic (no database queries in views).
