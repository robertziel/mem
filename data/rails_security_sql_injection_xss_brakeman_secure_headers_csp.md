### Rails Security Best Practices

**SQL injection in ActiveRecord:**
```ruby
# SAFE (parameterized)
User.where(email: params[:email])
User.where("email = ?", params[:email])

# VULNERABLE (string interpolation)
User.where("email = '#{params[:email]}'")   # ❌ NEVER
User.where("role = #{params[:role]}")        # ❌ NEVER
User.order("#{params[:sort_column]} ASC")    # ❌ column name injection

# Safe dynamic column ordering
ALLOWED_SORT = %w[name created_at email].freeze
sort = ALLOWED_SORT.include?(params[:sort]) ? params[:sort] : "created_at"
User.order(sort => :asc)
```

**XSS prevention (built-in):**
```erb
<%# SAFE: auto-escaped by default %>
<%= @user.name %>         <%# & < > " ' are escaped %>

<%# DANGEROUS: bypasses escaping %>
<%= raw @user.bio %>      <%# ❌ Renders raw HTML %>
<%= @user.bio.html_safe %> <%# ❌ Same danger %>

<%# Safe way to allow some HTML %>
<%= sanitize @user.bio, tags: %w[b i em strong a], attributes: %w[href] %>
```

**CSRF protection:**
```ruby
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception  # default in non-API mode
end

# API mode: skip CSRF, use token-based auth instead
class ApiController < ActionController::API
  # No CSRF protection needed (no cookies, use Bearer tokens)
end
```

**Brakeman (static security scanner):**
```bash
gem install brakeman
brakeman                    # scan entire Rails app
brakeman -o report.html     # HTML report
brakeman --no-pager         # CI-friendly output
brakeman -w2                # only medium+ severity
```

Common Brakeman warnings:
- SQL injection via string interpolation
- XSS via `raw`/`html_safe`
- Mass assignment (though strong params mitigates)
- Open redirect
- File access with user input

**Secure headers:**
```ruby
# Gemfile
gem 'secure_headers'

# config/initializers/secure_headers.rb
SecureHeaders::Configuration.default do |config|
  config.x_frame_options = "DENY"
  config.x_content_type_options = "nosniff"
  config.x_xss_protection = "0"  # deprecated, rely on CSP
  config.hsts = "max-age=31536000; includeSubDomains"
  config.csp = {
    default_src: %w['self'],
    script_src: %w['self'],
    style_src: %w['self' 'unsafe-inline'],
    img_src: %w['self' data:],
    connect_src: %w['self'],
    font_src: %w['self'],
    frame_ancestors: %w['none'],
  }
end
```

**Content Security Policy (Rails built-in):**
```ruby
# config/initializers/content_security_policy.rb
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self
    policy.script_src  :self
    policy.style_src   :self, :unsafe_inline
    policy.img_src     :self, :data, "https://cdn.example.com"
    policy.connect_src :self
  end
  config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(16) }
end
```

**Other security essentials:**
```ruby
# Force HTTPS
config.force_ssl = true  # in production.rb

# Filter sensitive params from logs
config.filter_parameters += [:password, :token, :secret, :credit_card]

# Encrypted credentials (not env vars in plaintext)
Rails.application.credentials.secret_api_key

# Prevent timing attacks on token comparison
ActiveSupport::SecurityUtils.secure_compare(token, expected)
```

**Security checklist:**
- [ ] Brakeman in CI pipeline (fail on high severity)
- [ ] Strong parameters on every controller action
- [ ] No `raw`/`html_safe` with user input
- [ ] CSP headers configured
- [ ] HTTPS forced in production
- [ ] Sensitive params filtered from logs
- [ ] Dependencies scanned (bundler-audit)
- [ ] Session cookies: HttpOnly, Secure, SameSite

**Rule of thumb:** Rails is secure by default — the danger is when you bypass defaults (`raw`, string interpolation in queries, `html_safe`). Run Brakeman in CI. Set CSP headers. Force HTTPS. Filter sensitive params. Use `bundler-audit` for dependency vulnerabilities.
