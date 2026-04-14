### Ruby: method_missing & respond_to_missing?

```ruby
class DynamicFinder
  def method_missing(name, *args, &block)
    if name.to_s.start_with?("find_by_")
      attribute = name.to_s.sub("find_by_", "")
      puts "Finding by #{attribute}: #{args.first}"
    else
      super  # ALWAYS call super for unknown methods
    end
  end

  # ALWAYS define alongside method_missing
  def respond_to_missing?(name, include_private = false)
    name.to_s.start_with?("find_by_") || super
  end
end

finder = DynamicFinder.new
finder.find_by_email("a@b.com")    # "Finding by email: a@b.com"
finder.respond_to?(:find_by_email) # true (because of respond_to_missing?)
```

**Rule of thumb:** Always pair `method_missing` with `respond_to_missing?`. Always call `super` for unhandled methods. `method_missing` is slow (full lookup chain). Prefer `define_method` when possible.
