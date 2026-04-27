### Decorator Pattern (Add Behavior Dynamically)

Wrap an object to extend its behavior without subclassing.

```ruby
class CachedRepository
  def initialize(repository, cache)
    @repository = repository
    @cache = cache
  end

  def find(id)
    @cache.fetch("user:#{id}") { @repository.find(id) }
  end
end

class LoggedRepository
  def initialize(repository, logger)
    @repository = repository
    @logger = logger
  end

  def find(id)
    @logger.info("Finding user #{id}")
    @repository.find(id)
  end
end

# Stack decorators
repo = LoggedRepository.new(
  CachedRepository.new(UserRepository.new, Rails.cache),
  Rails.logger
)
```

**Rule of thumb:** Decorator to add behavior without modifying existing classes. Stack multiple decorators. In Ruby, also achievable with `Module#prepend`. Common for: caching, logging, authorization wrappers.
