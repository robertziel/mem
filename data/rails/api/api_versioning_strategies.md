### API Versioning Strategies

**Why version an API?**
Once clients depend on your API, breaking changes (renamed fields, removed endpoints, changed behavior) will break them. Versioning lets you evolve the API while giving clients time to migrate.

**Strategy 1: URL-based versioning (most common):**
```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :posts, only: [:index, :show, :create, :update, :destroy]
      resources :users, only: [:index, :show]
    end

    namespace :v2 do
      resources :posts, only: [:index, :show, :create, :update, :destroy]
      resources :users, only: [:index, :show]
    end
  end
end

# GET /api/v1/posts
# GET /api/v2/posts

# app/controllers/api/v1/posts_controller.rb
module Api
  module V1
    class PostsController < Api::BaseController
      def index
        posts = Post.all
        render json: posts, each_serializer: Api::V1::PostSerializer
      end
    end
  end
end

# app/controllers/api/v2/posts_controller.rb
module Api
  module V2
    class PostsController < Api::BaseController
      def index
        posts = Post.includes(:author, :tags)
        render json: posts, each_serializer: Api::V2::PostSerializer
      end
    end
  end
end
```

**Strategy 2: Header-based versioning (Accept header):**
```ruby
# Client sends: Accept: application/vnd.myapp.v2+json

# config/routes.rb
Rails.application.routes.draw do
  namespace :api, defaults: { format: :json } do
    scope module: :v2, constraints: ApiVersion.new("v2", true) do
      resources :posts
    end

    scope module: :v1, constraints: ApiVersion.new("v1") do
      resources :posts
    end
  end
end

# app/constraints/api_version.rb (route constraint)
class ApiVersion
  def initialize(version, default = false)
    @version = version
    @default = default
  end

  def matches?(request)
    @default || check_headers(request)
  end

  private

  def check_headers(request)
    accept = request.headers.fetch("Accept", "")
    accept.include?("application/vnd.myapp.#{@version}+json")
  end
end

# GET /api/posts with Accept: application/vnd.myapp.v2+json -> v2 controller
# GET /api/posts (no version header) -> v2 (default)
```

**Strategy 3: Query parameter versioning:**
```ruby
# GET /api/posts?version=2

# config/routes.rb
namespace :api do
  resources :posts, only: [:index, :show]
end

# app/controllers/api/posts_controller.rb
module Api
  class PostsController < Api::BaseController
    def index
      case api_version
      when 1
        render json: posts, each_serializer: V1::PostSerializer
      when 2
        render json: posts, each_serializer: V2::PostSerializer
      else
        render json: { error: "Unknown API version" }, status: :bad_request
      end
    end

    private

    def api_version
      (params[:version] || 2).to_i
    end
  end
end
```

**Comparison of versioning strategies:**
| Strategy | URL | Header | Query param |
|----------|-----|--------|-------------|
| Example | `/api/v1/posts` | `Accept: vnd.myapp.v2+json` | `/api/posts?version=2` |
| Visibility | Obvious in URL | Hidden in headers | Somewhat visible |
| Cacheability | Easy (URL-based cache keys) | Harder (Vary header needed) | Easy |
| REST purity | Less pure (version in URI) | More RESTful | Less pure |
| Client ease | Very easy | Requires header config | Easy |
| Adoption | Most popular | GitHub, Stripe | Less common |

**Rule of thumb:** Use URL-based versioning (`/api/v1/`) for simplicity -- it is the most common and easiest for clients. Header-based versioning is more RESTful but adds complexity. Query parameter versioning works but is the least conventional. Only create a new version for breaking changes -- additive changes (new fields) can go in the current version.
