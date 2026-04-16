### Rails Engines (Mountable, Isolated Namespace, Gem-Packaged)

**What a Rails engine is:**
- A miniature Rails application that provides functionality to its host
- Has its own models, controllers, views, routes, migrations, and assets
- Can be distributed as a gem and mounted inside any Rails app
- Examples: Devise (authentication), Sidekiq::Web (dashboard), RailsAdmin

**Generating an engine:**
```ruby
# Full engine (shares namespace with host app)
rails plugin new my_engine --full

# Mountable engine (isolated namespace, preferred)
rails plugin new my_engine --mountable

# Directory structure created:
# my_engine/
#   app/controllers/my_engine/
#   app/models/my_engine/
#   app/views/my_engine/
#   config/routes.rb
#   lib/my_engine/engine.rb
#   my_engine.gemspec
```

**Isolated namespace (mountable engine):**
```ruby
# lib/my_engine/engine.rb
module MyEngine
  class Engine < ::Rails::Engine
    isolate_namespace MyEngine  # key line
  end
end

# This means:
# - Models are MyEngine::Post, not Post
# - Tables are my_engine_posts, not posts
# - Routes are scoped under the mount point
# - No name collisions with host app
```

**Mounting the engine in host app:**
```ruby
# Host app config/routes.rb
Rails.application.routes.draw do
  mount MyEngine::Engine, at: "/blog"    # all engine routes under /blog
  mount Sidekiq::Web, at: "/sidekiq"     # common real-world example

  # Engine routes are now accessible:
  # /blog/posts      -> MyEngine::PostsController#index
  # /blog/posts/1    -> MyEngine::PostsController#show
end
```

**Engine routes:**
```ruby
# my_engine/config/routes.rb
MyEngine::Engine.routes.draw do
  resources :posts do
    resources :comments, only: [:create, :destroy]
  end
  root to: "posts#index"
end

# Linking to engine routes from host app views:
<%= link_to "Blog", my_engine.posts_path %>

# Linking to host app routes from engine views:
<%= link_to "Home", main_app.root_path %>
```

**Sharing models between engine and host app:**
```ruby
# Engine model references host app's User
# my_engine/app/models/my_engine/post.rb
module MyEngine
  class Post < ApplicationRecord
    belongs_to :author, class_name: MyEngine.user_class

    def self.table_name_prefix
      "my_engine_"  # tables: my_engine_posts
    end
  end
end

# Make user class configurable
# lib/my_engine.rb
module MyEngine
  mattr_accessor :user_class
  self.user_class = "User"  # default

  def self.setup
    yield self
  end
end

# Host app initializer: config/initializers/my_engine.rb
MyEngine.setup do |config|
  config.user_class = "AdminUser"
end
```

**Engine migrations:**
```ruby
# Install engine migrations into host app
bin/rails my_engine:install:migrations

# This copies migrations from engine to host app's db/migrate/
# Prefixed with engine name to avoid conflicts

# Run them normally
bin/rails db:migrate
```

**Packaging an engine as a gem:**
```ruby
# my_engine.gemspec
Gem::Specification.new do |spec|
  spec.name        = "my_engine"
  spec.version     = MyEngine::VERSION
  spec.authors     = ["Your Name"]
  spec.summary     = "A blog engine for Rails"

  spec.files = Dir["{app,config,db,lib}/**/*", "Rakefile"]

  spec.add_dependency "rails", ">= 7.0"
  spec.add_dependency "pg"
end

# Host app Gemfile
gem "my_engine", path: "../my_engine"          # local development
gem "my_engine", git: "https://github.com/..."  # git source
gem "my_engine", "~> 1.0"                       # published gem
```

**Engine configuration and hooks:**
```ruby
# lib/my_engine/engine.rb
module MyEngine
  class Engine < ::Rails::Engine
    isolate_namespace MyEngine

    # Add engine middleware
    initializer "my_engine.middleware" do |app|
      app.middleware.use MyEngine::SomeMiddleware
    end

    # Extend host app classes
    config.to_prepare do
      # Safe to reference host app classes here (reloads in dev)
      User.include MyEngine::UserExtensions
    end

    # Add custom asset paths
    initializer "my_engine.assets" do |app|
      app.config.assets.precompile += %w[my_engine/application.css]
    end
  end
end
```

**Full engine vs mountable engine:**
| Feature | Full Engine (--full) | Mountable Engine (--mountable) |
|---------|---------------------|-------------------------------|
| Namespace isolation | No (shares with host) | Yes (MyEngine::Post) |
| Table prefix | None | my_engine_ |
| Route scope | Mixed into host routes | Mounted at a path |
| Name collisions | Possible | Prevented |
| When to use | Tight host integration | Portable/reusable plugin |

**Engine vs application concerns:**
| Need | Use Engine | Use Concern/Gem |
|------|-----------|-----------------|
| Own models + migrations | Yes | No |
| Own routes + controllers | Yes | No |
| Shared logic (module) | No | Yes |
| Own admin UI | Yes | No |
| Distributable plugin | Yes | Maybe |

**Testing an engine:**
```ruby
# Engine has a dummy Rails app for testing
# test/dummy/ or spec/dummy/

# Run engine tests
cd my_engine
bin/rails test        # or bundle exec rspec

# The dummy app mounts the engine automatically:
# test/dummy/config/routes.rb
Rails.application.routes.draw do
  mount MyEngine::Engine => "/my_engine"
end
```

**Rule of thumb:** Use a mountable engine with `isolate_namespace` when building a self-contained feature (blog, CMS, admin panel) that could be reused across apps. Use a full engine only when deep integration with the host is required. If you just need shared methods without routes, models, or views, a plain gem with a concern is simpler than an engine.
