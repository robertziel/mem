### Rails Security: Content Security Policy (CSP) & Secure Headers

**CSP (built into Rails):**
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

**Secure headers gem:**
```ruby
gem 'secure_headers'

SecureHeaders::Configuration.default do |config|
  config.x_frame_options = "DENY"
  config.x_content_type_options = "nosniff"
  config.hsts = "max-age=31536000; includeSubDomains"
end
```

**Other security essentials:**
```ruby
config.force_ssl = true  # Force HTTPS
config.filter_parameters += [:password, :token, :secret]  # Filter logs
ActiveSupport::SecurityUtils.secure_compare(token, expected)  # Timing-safe compare
```

**Rule of thumb:** Set CSP headers (block inline scripts). Force HTTPS in production. Filter sensitive params from logs. Use `secure_headers` gem for comprehensive header management.
