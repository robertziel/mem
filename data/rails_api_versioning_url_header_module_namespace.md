### API Versioning in Rails

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

**Module namespacing (directory structure):**
```
app/controllers/
  api/
    base_controller.rb       # shared API logic
    v1/
      posts_controller.rb
      users_controller.rb
    v2/
      posts_controller.rb
      users_controller.rb

app/serializers/
  api/
    v1/
      post_serializer.rb     # v1 response shape
    v2/
      post_serializer.rb     # v2 response shape (new fields, renamed keys)
```

**Shared base controller:**
```ruby
# app/controllers/api/base_controller.rb
module Api
  class BaseController < ApplicationController
    skip_before_action :verify_authenticity_token
    before_action :authenticate!
    rescue_from ActiveRecord::RecordNotFound, with: :not_found

    private

    def authenticate!
      # shared auth logic
    end

    def not_found
      render json: { error: "Not found" }, status: :not_found
    end
  end
end

# V1 and V2 both inherit shared behavior
module Api
  module V1
    class PostsController < Api::BaseController
      # v1-specific logic
    end
  end
end
```

**Inheriting from the previous version (DRY):**
```ruby
# If v2 is mostly the same as v1, inherit and override
module Api
  module V2
    class PostsController < Api::V1::PostsController
      # Override only what changed
      def index
        posts = Post.includes(:author)
        render json: posts, each_serializer: Api::V2::PostSerializer
      end

      # show, create, update, destroy inherited from V1
    end
  end
end
```

**Versioned serializers:**
```ruby
# app/serializers/api/v1/post_serializer.rb
module Api
  module V1
    class PostSerializer < ActiveModel::Serializer
      attributes :id, :title, :body, :created_at
      belongs_to :user  # returns user_id
    end
  end
end

# app/serializers/api/v2/post_serializer.rb
module Api
  module V2
    class PostSerializer < ActiveModel::Serializer
      attributes :id, :title, :body, :published_at, :slug, :reading_time
      belongs_to :author, serializer: Api::V2::UserSerializer  # renamed, expanded
      has_many :tags
    end
  end
end
```

**Deprecation strategy:**
```ruby
# Signal deprecation via response headers
module Api
  module V1
    class BaseController < Api::BaseController
      after_action :add_deprecation_header

      private

      def add_deprecation_header
        response.headers["Sunset"] = "Sat, 01 Mar 2025 00:00:00 GMT"
        response.headers["Deprecation"] = "true"
        response.headers["Link"] = '<https://api.example.com/v2>; rel="successor-version"'
      end
    end
  end
end

# Log v1 usage for migration tracking
class Api::V1::BaseController < Api::BaseController
  after_action :track_v1_usage

  private

  def track_v1_usage
    Rails.logger.info "[DEPRECATED API v1] #{request.method} #{request.path} by #{current_user&.id}"
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

**Rule of thumb:** Use URL-based versioning (`/api/v1/`) for simplicity -- it is the most common and easiest for clients. Use module namespaces to organize controllers and serializers per version. Inherit from the previous version's controller to avoid duplicating unchanged endpoints. Set deprecation headers and log usage on old versions to track migration. Only create a new version for breaking changes -- additive changes (new fields) can go in the current version.
