### ActiveSupport: mattr_accessor / cattr_accessor

```ruby
# Module-level accessors (like attr_accessor but for modules/classes)
module MyConfig
  mattr_accessor :api_key
  mattr_accessor :timeout, default: 30
  mattr_accessor :debug, default: false

  mattr_reader :version   # read-only
  mattr_writer :secret    # write-only
end

MyConfig.api_key = "abc123"
MyConfig.api_key    # "abc123"
MyConfig.timeout    # 30 (default)

# cattr_accessor is the same thing for classes
class AppConfig
  cattr_accessor :site_name, default: "My App"
end

AppConfig.site_name  # "My App"
```

**Rule of thumb:** Use `mattr_accessor` for module-level configuration. Prefer Rails credentials or environment variables for secrets. `mattr_accessor` creates both class-level and instance-level accessors (instance delegates to class).
