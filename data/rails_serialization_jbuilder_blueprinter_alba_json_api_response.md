### Rails JSON Serialization

**Options landscape:**
| Gem | Approach | Speed | Style |
|-----|----------|-------|-------|
| Jbuilder | Template (DSL) | Slow | Rails default |
| Blueprinter | Declarative class | Fast | Simple, explicit |
| Alba | Declarative class | Fastest | Modern, flexible |
| ActiveModelSerializers | Declarative class | Medium | JSON:API, legacy |
| Oj + manual | Raw hash | Fastest | Full control |

**Jbuilder (Rails built-in):**
```ruby
# app/views/posts/show.json.jbuilder
json.id @post.id
json.title @post.title
json.body @post.body
json.author do
  json.id @post.user.id
  json.name @post.user.name
end
json.comments @post.comments do |comment|
  json.id comment.id
  json.body comment.body
end
```

**Blueprinter (explicit, fast):**
```ruby
class PostBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :body, :created_at

  view :detailed do
    association :user, blueprint: UserBlueprint
    association :comments, blueprint: CommentBlueprint
  end
end

# Controller
render json: PostBlueprint.render(@post, view: :detailed)
render json: PostBlueprint.render(@posts, view: :detailed)  # collection
```

**Alba (modern, fastest):**
```ruby
class PostResource
  include Alba::Resource

  attributes :id, :title, :body, :created_at

  one :user, resource: UserResource
  many :comments, resource: CommentResource

  attribute :reading_time do |post|
    (post.body.split.size / 200.0).ceil
  end
end

# Controller
render json: PostResource.new(@post).serialize
```

**N+1 in serializers (common trap):**
```ruby
# BAD: each post triggers a query for user and comments
render json: PostBlueprint.render(Post.all, view: :detailed)
# N+1: 1 query for posts, N for users, N for comments

# GOOD: eager load associations before serializing
posts = Post.includes(:user, :comments).all
render json: PostBlueprint.render(posts, view: :detailed)
```

**Manual JSON (fastest, full control):**
```ruby
class PostsController < ApplicationController
  def index
    posts = Post.includes(:user).select(:id, :title, :user_id, :created_at)
    render json: posts.map { |p|
      {
        id: p.id,
        title: p.title,
        author: p.user.name,
        created_at: p.created_at.iso8601
      }
    }
  end
end
```

**Conditional fields and views:**
```ruby
class UserBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :email

  view :admin do
    fields :role, :last_login_at, :created_at
  end
end

# Public API gets minimal fields, admin gets full details
render json: UserBlueprint.render(user, view: current_user.admin? ? :admin : :default)
```

**Rule of thumb:** Use Blueprinter or Alba for APIs (explicit, fast, testable). Jbuilder only for simple views. Always eager-load associations before serializing. Use views/profiles for different response levels (public vs admin). Avoid AMS (legacy, slow).
