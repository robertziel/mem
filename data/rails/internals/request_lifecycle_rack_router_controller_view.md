### Rails Request Lifecycle

**Full request flow diagram:**
```
HTTP Request (browser/client)
       |
       v
  Web Server (Puma/Unicorn)
       |
       v
  Rack Middleware Stack
  [ActionDispatch::SSL]
  [Rack::Sendfile]
  [ActionDispatch::Executor]
  [ActionDispatch::Cookies]
  [ActionDispatch::Session]
  [ActionDispatch::Flash]
  [Rack::MethodOverride]
  [ActionDispatch::RequestId]
  [Rails::Rack::Logger]
  [ActionDispatch::ShowExceptions]
  [ActionDispatch::RemoteIp]
       |
       v
  Rails Router (config/routes.rb)
  matches URL + HTTP method -> controller#action
       |
       v
  Controller Dispatch
  [before_action callbacks]
       |
       v
  Controller Action
  (business logic, model queries)
       |
       v
  View Rendering
  (ERB/Jbuilder/JSON)
       |
       v
  [after_action callbacks]
       |
       v
  HTTP Response (status + headers + body)
       |
       v
  Back through Rack middleware (response phase)
       |
       v
  Client receives response
```

**Step 1: HTTP request hits the web server (Puma):**
```ruby
# Puma receives the raw HTTP request
# config/puma.rb
workers ENV.fetch("WEB_CONCURRENCY") { 2 }
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count

# Puma parses HTTP into a Rack-compatible env hash:
# {
#   "REQUEST_METHOD" => "GET",
#   "PATH_INFO"      => "/posts/1",
#   "HTTP_HOST"      => "example.com",
#   "rack.input"     => #<StringIO>,
#   ...
# }
```

**Step 2: Rack middleware stack:**
```ruby
# See the full middleware stack
bin/rails middleware

# Output (simplified):
# use ActionDispatch::SSL
# use Rack::Sendfile
# use ActionDispatch::Executor
# use ActionDispatch::Cookies
# use ActionDispatch::Session::CookieStore
# use ActionDispatch::Flash
# use ActionDispatch::RequestId
# use Rails::Rack::Logger
# use ActionDispatch::ShowExceptions
# use ActionDispatch::RemoteIp
# run MyApp::Application.routes  <-- the router

# Each middleware wraps the next:
class SimpleMiddleware
  def initialize(app)
    @app = app           # the next middleware in the chain
  end

  def call(env)
    # Before the request hits Rails:
    start = Time.current

    status, headers, body = @app.call(env)  # pass to next middleware

    # After the response comes back:
    duration = Time.current - start
    headers["X-Response-Time"] = duration.to_s

    [status, headers, body]
  end
end
```

**Step 3: Rails router:**
```ruby
# config/routes.rb
Rails.application.routes.draw do
  resources :posts        # generates 7 RESTful routes
  get "/about", to: "pages#about"
end

# Router matches: GET /posts/1
# Resolves to:    PostsController#show, params[:id] = "1"
# Internally:     PostsController.action(:show).call(env)

# See all routes:
bin/rails routes

# Router returns 404 if no match:
# ActionController::RoutingError (No route matches [GET] "/nonexistent")
```

**Step 4: Controller dispatch and callbacks:**
```ruby
class PostsController < ApplicationController
  before_action :authenticate_user!          # runs first
  before_action :set_post, only: [:show]     # runs second

  # Step 5: The action executes
  def show
    # @post is set by before_action
    # Model queries happen here
    @comments = @post.comments.includes(:author).recent
  end
  # Step 6: View rendering happens implicitly after action

  private

  def set_post
    @post = Post.find(params[:id])
    # If not found: ActiveRecord::RecordNotFound -> 404
  end
end

# Callback chain order:
# 1. before_action filters (in order defined)
# 2. The action method
# 3. View rendering (implicit or explicit)
# 4. after_action filters (in reverse order)
# If any before_action calls render/redirect, chain halts
```

**Step 5: Action and model interaction:**
```ruby
def show
  @post = Post.find(params[:id])
  # ActiveRecord generates SQL: SELECT * FROM posts WHERE id = 1

  respond_to do |format|
    format.html  # renders app/views/posts/show.html.erb
    format.json { render json: @post }
  end
end
```

**Step 6: View rendering:**
```ruby
# Implicit rendering: Rails looks for app/views/posts/show.html.erb
# Template rendering chain:
# 1. Layout: app/views/layouts/application.html.erb
# 2. Template: app/views/posts/show.html.erb
# 3. Partials: _comment.html.erb (if rendered)
# 4. Helpers: PostsHelper methods available in views

# Explicit rendering options:
render :show                          # same view, explicit
render json: @post                    # JSON response
render plain: "OK"                    # plain text
render status: :created               # custom status code
redirect_to posts_path                # 302 redirect (no render)
head :no_content                      # 204 with no body
```

**Step 7: Response travels back:**
```ruby
# After rendering, Rails builds the response:
# - Status code (200, 302, 404, etc.)
# - Headers (Content-Type, Set-Cookie, Cache-Control, etc.)
# - Body (HTML string, JSON, etc.)

# Response passes back UP through the middleware stack
# Each middleware can modify the response on its way out
# (add headers, transform body, log request, etc.)

# Finally Puma sends the HTTP response to the client
```

**Key objects at each stage:**
| Stage | Key Object | Access it with |
|-------|-----------|---------------|
| Rack env | Hash | env / request.env |
| Request | ActionDispatch::Request | request |
| Params | ActionController::Parameters | params |
| Response | ActionDispatch::Response | response |
| Session | ActionDispatch::Session | session |
| Cookies | ActionDispatch::Cookies | cookies |
| Flash | ActionDispatch::Flash | flash |

**Request timing breakdown:**
```ruby
# Available in process_action.action_controller event:
# event.payload[:db_runtime]     # time in ActiveRecord (ms)
# event.payload[:view_runtime]   # time rendering views (ms)
# event.duration                 # total time (ms)

# Typical log line:
# Completed 200 OK in 52ms (Views: 27.3ms | ActiveRecord: 12.1ms)
#
# Unaccounted time (52 - 27.3 - 12.1 = 12.6ms):
#   - Middleware processing
#   - Ruby computation in the action
#   - External API calls
#   - Memory allocation / GC
```

**Debugging the lifecycle:**
```ruby
# Log the request at each stage
config.middleware.insert_before 0, MyDebugMiddleware

# See which callbacks run
class ApplicationController < ActionController::Base
  around_action :trace_action

  private

  def trace_action
    Rails.logger.debug ">>> Before #{controller_name}##{action_name}"
    yield
    Rails.logger.debug ">>> After #{controller_name}##{action_name}"
  end
end
```

**Rule of thumb:** Think of a Rails request as a sandwich -- Rack middleware wraps the outside (touching the request first and the response last), the router dispatches in the middle, and the controller action is the core. Understanding this flow is essential for debugging slow requests: check `db_runtime` for slow queries, `view_runtime` for template issues, and the gap between them for application-level bottlenecks.
