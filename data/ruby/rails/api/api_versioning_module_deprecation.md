### API Versioning Modules and Deprecation

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

**Rule of thumb:** Use module namespaces to organize controllers and serializers per version. Inherit from the previous version's controller to avoid duplicating unchanged endpoints. Use versioned serializers to control response shape independently per version. Set Sunset and Deprecation headers on old versions and log usage to track migration progress before sunsetting.
