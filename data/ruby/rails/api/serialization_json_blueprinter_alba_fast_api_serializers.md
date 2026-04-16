### Rails JSON Serialization: Blueprinter & Alba (Fast API Serializers)

**Blueprinter (declarative, fast):**
```ruby
class PostBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :body, :created_at

  view :detailed do
    association :user, blueprint: UserBlueprint
    association :comments, blueprint: CommentBlueprint
  end
end

render json: PostBlueprint.render(@post, view: :detailed)
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

render json: PostResource.new(@post).serialize
```

**Comparison:**
| Gem | Speed | Style |
|-----|-------|-------|
| Jbuilder | Slow | Template DSL |
| Blueprinter | Fast | Declarative class |
| Alba | Fastest | Declarative class |

**N+1 trap:** Always `includes(:association)` before serializing collections.

**Rule of thumb:** Blueprinter or Alba for APIs. Views/profiles for different response levels. Always eager-load associations before serializing.
