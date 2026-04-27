### Singleton Pattern (Single Instance)

Ensure a class has only one instance with global access.

```ruby
class Configuration
  include Singleton
  attr_accessor :api_key, :timeout
end

config = Configuration.instance
config.api_key = "abc123"

# Or in Ruby: just use a module with module-level state
module AppConfig
  mattr_accessor :api_key, :timeout
end
```

**When acceptable:** configuration, connection pools, loggers.

**Why to avoid:** hides dependencies, makes testing harder, creates global state.

**Rule of thumb:** Prefer dependency injection over Singleton. Use Singleton only when you genuinely need exactly one instance (rare). In Ruby, modules with `mattr_accessor` are often a simpler alternative.
