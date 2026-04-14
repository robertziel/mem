### Rails Boot Process and Initializers

**Boot sequence order:**
```
1. bin/rails server (or console, runner, etc.)
2. config/boot.rb
   - Sets up Bundler, loads gems from Gemfile
3. config/application.rb
   - Requires Rails frameworks (ActiveRecord, ActionController, etc.)
   - Defines YourApp::Application < Rails::Application
   - Configures settings shared across all environments
4. config/environment.rb
   - Calls Rails.application.initialize!
   - Triggers the full initialization sequence
5. config/environments/{development,test,production}.rb
   - Environment-specific overrides
6. config/initializers/*.rb
   - Custom initializers (alphabetical order)
7. Application ready to serve requests
```

**config/boot.rb:**
```ruby
# Sets up gem loading via Bundler
ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)
require "bundler/setup"  # Set up gems listed in the Gemfile
require "bootsnap/setup"  # Speed up boot time (optional)
```

**config/application.rb:**
```ruby
require_relative "boot"
require "rails/all"  # loads all frameworks

# Or selectively load frameworks:
# require "active_record/railtie"
# require "active_storage/engine"
# require "action_controller/railtie"
# require "action_view/railtie"
# require "action_mailer/railtie"
# require "active_job/railtie"
# require "action_cable/engine"

Bundler.require(*Rails.groups)  # requires gems for current env group

module MyApp
  class Application < Rails::Application
    config.load_defaults 7.1  # use defaults from Rails 7.1

    # Settings shared across ALL environments:
    config.time_zone = "Eastern Time (US & Canada)"
    config.active_record.default_timezone = :utc

    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot
    end

    # API-only mode
    # config.api_only = true
  end
end
```

**config/environments/production.rb:**
```ruby
Rails.application.configure do
  config.cache_classes = true       # don't reload code on each request
  config.eager_load = true          # load all classes at boot (faster first request)
  config.consider_all_requests_local = false  # don't show error details
  config.action_controller.perform_caching = true

  config.log_level = :info
  config.log_tags = [:request_id]
  config.logger = ActiveSupport::TaggedLogging.new(
    ActiveSupport::Logger.new(STDOUT)
  )

  config.active_record.dump_schema_after_migration = false

  config.force_ssl = true

  # Asset pipeline
  config.assets.compile = false     # don't compile assets on the fly
  config.assets.digest = true       # fingerprinted filenames
end
```

**config/environments/development.rb:**
```ruby
Rails.application.configure do
  config.cache_classes = false       # reload code on every request
  config.eager_load = false          # lazy load classes (faster boot)
  config.consider_all_requests_local = true   # show detailed errors

  # Dev caching toggle (bin/rails dev:cache)
  if Rails.root.join("tmp/caching-dev.txt").exist?
    config.action_controller.perform_caching = true
    config.cache_store = :memory_store
  else
    config.action_controller.perform_caching = false
    config.cache_store = :null_store
  end

  config.active_record.migration_error = :page_load  # show pending migrations
  config.active_record.verbose_query_logs = true      # log query source
end
```

**Custom initializers (config/initializers/):**
```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "localhost:3000"
    resource "*", headers: :any, methods: [:get, :post, :put, :delete]
  end
end

# config/initializers/redis.rb
REDIS = Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))

# config/initializers/inflections.rb
ActiveSupport::Inflector.inflections(:en) do |inflect|
  inflect.acronym "API"
  inflect.acronym "HTML"
  inflect.irregular "person", "people"
end

# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch("REDIS_URL") }
end

# Initializers run in alphabetical order by filename
# Prefix with numbers to control order: 01_redis.rb, 02_sidekiq.rb
```

**config.after_initialize:**
```ruby
# config/application.rb or config/environments/*.rb
Rails.application.config.after_initialize do
  # Runs AFTER all initializers and frameworks are loaded
  # Safe to reference models, routes, etc.
  ActionMailer::Base.default_url_options = {
    host: Rails.application.credentials.host
  }
end
```

**config.to_prepare:**
```ruby
# Runs once in production, on every request in development
Rails.application.config.to_prepare do
  # Safe place to monkey-patch or extend classes that get reloaded
  User.include SpecialBehavior
end
```

**Eager loading:**
```ruby
# Production: eager_load = true
# - All classes under autoload_paths loaded at boot
# - Required for thread safety (avoid race conditions loading classes)
# - Slower boot, faster first request

# Development: eager_load = false
# - Classes loaded on first use (Zeitwerk autoloader)
# - Faster boot, slower first request

# Add paths to eager load:
config.eager_load_paths += %W[#{config.root}/lib]
config.eager_load_paths += %W[#{config.root}/app/services]

# Check what gets eager loaded:
bin/rails zeitwerk:check
```

**Rails.application.config common settings:**
```ruby
# Access configuration anywhere
Rails.application.config.time_zone          # "Eastern Time (US & Canada)"
Rails.application.config.eager_load         # true/false
Rails.application.config.cache_store        # :redis_cache_store, etc.

# Custom configuration
config.x.payment_gateway.api_key = ENV["PAYMENT_KEY"]
config.x.payment_gateway.sandbox = true

# Access custom config
Rails.configuration.x.payment_gateway.api_key

# Or use credentials (preferred for secrets)
Rails.application.credentials.payment_gateway[:api_key]
```

**Environment detection:**
```ruby
Rails.env.production?    # true in production
Rails.env.development?   # true in development
Rails.env.test?          # true in test
Rails.env               # "production" (string)

# Set with: RAILS_ENV=production bin/rails server
```

**Boot process hooks summary:**
| Hook | When | Reloads in dev? | Use case |
|------|------|-----------------|----------|
| config/application.rb | Early boot | No | Framework config |
| config/environments/*.rb | After app definition | No | Env-specific settings |
| config/initializers/*.rb | During initialization | No | Gem setup, constants |
| after_initialize | After all initializers | No | Post-init setup |
| to_prepare | Before each request (dev) | Yes | Patching reloadable classes |
| config.after_routes_loaded | After routes load | Yes | Route-dependent logic |

**Debugging the boot process:**
```ruby
# See the initialization order
bin/rails initializers

# Trace what loads when
bin/rails zeitwerk:check

# Profile boot time
RAILS_LOG_TO_STDOUT=1 bin/rails runner "puts 'booted'"

# Common boot errors:
# - Circular dependency: class A requires B, B requires A
# - Missing initializer dependency: reference a class not yet loaded
# - Wrong load order: use after_initialize for late references
```

**Rule of thumb:** Put framework and gem configuration in `config/application.rb` or environment files. Put runtime setup (Redis connections, third-party SDK init) in `config/initializers/`. Use `after_initialize` when you need all Rails components loaded first. Never reference application models or routes in initializers directly -- use `to_prepare` or `after_initialize` blocks instead.
