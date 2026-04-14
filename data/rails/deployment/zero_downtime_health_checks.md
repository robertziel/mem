### Rails Zero-Downtime Deployment & Health Checks

**Zero-downtime deploy requirements:**
1. Rolling restart (old processes serve while new ones start)
2. Database migrations backward compatible with old code
3. Health check endpoint for load balancer

**Health check:**
```ruby
# config/routes.rb
get "/health", to: proc { [200, {}, ["ok"]] }

# Or with dependency checks:
class HealthController < ApplicationController
  skip_before_action :authenticate_user!

  def show
    ActiveRecord::Base.connection.execute("SELECT 1")
    Rails.cache.read("health_check_test")
    render json: { status: "ok" }, status: :ok
  rescue => e
    render json: { status: "error", message: e.message }, status: :service_unavailable
  end
end
```

**Puma phased restart (zero downtime):**
```bash
# Phased restart: restart workers one at a time
pumactl phased-restart
# Each worker finishes current requests → restarts → serves new code
# At least one worker always serving
```

**Rule of thumb:** Health check at `/health` for load balancer. Phased restart for zero-downtime. Expand-contract for database migrations (backward compatible with both old and new code). Never deploy schema changes that break running code.
