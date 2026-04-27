### Rails Request Lifecycle (Rack → Router → Controller → View)

**Flow:**

```
Client → Puma → Rack middleware stack → Router → Controller (before_action → action → after_action) → View → Response ← Rack middleware (response phase) ← Client
```

**Per-stage cheatsheet:**

| Stage | Owner | Key object | Access | If slow / failing |
|---|---|---|---|---|
| Accept connection | Puma (workers × threads) | Rack `env` Hash | `request.env` | Tune `WEB_CONCURRENCY`, `RAILS_MAX_THREADS` |
| Middleware (request phase) | Rack | `ActionDispatch::Request` | `request` | `bin/rails middleware`; insert before/after specific middleware |
| Routing | `config/routes.rb` | `ActionDispatch::Routing` | `bin/rails routes` | Returns `RoutingError` (404) if no match |
| Controller dispatch | `ApplicationController` | `ActionController::Parameters` | `params` | `before_action` halts chain on `render`/`redirect` |
| Action body | Your controller | model objects | — | Slow → check `db_runtime` |
| View rendering | ActionView | template + layout + partials + helpers | `render` / implicit | Slow → check `view_runtime` |
| Middleware (response phase) | Rack (reverse order) | `ActionDispatch::Response` | `response` | Headers, cookies, flash applied here |
| Send response | Puma | — | — | — |

**Default middleware stack (request order):**

| # | Middleware | What it does |
|---|---|---|
| 1 | `ActionDispatch::SSL` | Force HTTPS in prod |
| 2 | `Rack::Sendfile` | Hand off file responses to web server |
| 3 | `ActionDispatch::Executor` | Reload code, manage Rails executor |
| 4 | `ActionDispatch::Cookies` | Parse/write cookies |
| 5 | `ActionDispatch::Session::CookieStore` | Session de/serialization |
| 6 | `ActionDispatch::Flash` | One-shot flash messages |
| 7 | `Rack::MethodOverride` | `_method=PATCH` form trick |
| 8 | `ActionDispatch::RequestId` | `X-Request-Id` header |
| 9 | `Rails::Rack::Logger` | Per-request log block |
| 10 | `ActionDispatch::ShowExceptions` + `DebugExceptions` | Error pages |
| 11 | `ActionDispatch::RemoteIp` | Real client IP behind proxies |
| → | Router | Dispatch to controller |

**Callback chain order:**

| Order | Step | Halt-on-render? |
|---|---|---|
| 1 | `before_action` (in declaration order) | Yes — `render`/`redirect` stops the chain |
| 2 | Action method | — |
| 3 | View rendering (implicit unless action rendered) | — |
| 4 | `after_action` (reverse declaration order) | No |
| Around | `around_action` | Wraps entire `before+action+after` block |

**Render method dispatch:**

| Form | Effect |
|---|---|
| (no call) | Implicit render of `app/views/<controller>/<action>.<format>.<engine>` |
| `render :show` | Same view, explicit |
| `render json: @x` | JSON response |
| `render plain: "OK"` | Text |
| `render status: :created` | Override status, render default view |
| `redirect_to path` | 302; **does not render** |
| `head :no_content` | 204, empty body |

**Per-request key objects:**

| Object | Class | Read via |
|---|---|---|
| Rack env | `Hash` | `request.env` |
| Request | `ActionDispatch::Request` | `request` |
| Params | `ActionController::Parameters` | `params` |
| Response | `ActionDispatch::Response` | `response` |
| Session | `ActionDispatch::Session::*` | `session` |
| Cookies | `ActionDispatch::Cookies::CookieJar` | `cookies` |
| Flash | `ActionDispatch::Flash::FlashHash` | `flash` |

**Timing log line — `Completed 200 OK in 52ms (Views: 27.3ms | ActiveRecord: 12.1ms)`:**

| Bucket | Source | Investigate with |
|---|---|---|
| `ActiveRecord` | `db_runtime` from `process_action` event | `EXPLAIN`, `bullet` for N+1, missing indexes |
| `Views` | `view_runtime` | Heavy partials, missing fragment caching |
| Unaccounted (total − DB − Views) | Middleware + Ruby + external APIs + GC | `rack-mini-profiler`, `stackprof` |

**Writing a middleware (sandwich shape):**

```ruby
class TimingMiddleware
  def initialize(app); @app = app; end
  def call(env)
    t = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    status, headers, body = @app.call(env)
    headers["X-Response-Time"] = "#{Process.clock_gettime(Process::CLOCK_MONOTONIC) - t}"
    [status, headers, body]
  end
end
```

**Rule of thumb:** middleware **wraps** (request goes down, response goes up); the **router dispatches**; the **action is the core**. To debug a slow request, split the log line: high `ActiveRecord` → query/indexing; high `Views` → templates/partials; large gap between total and the two → middleware, GC, or external I/O. Use `bin/rails middleware` to see the actual stack and `bin/rails routes` to see what dispatches where.
