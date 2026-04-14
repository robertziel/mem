### Ruby memoization pitfalls with falsey values

This common pattern breaks when the result can be `false` or `nil`:

```ruby
@result ||= expensive_check
```

If `expensive_check` returns `false`, Ruby will run it again on the next call.

### Safer pattern

```ruby
if instance_variable_defined?(:@result)
  @result
else
  @result = expensive_check
end
```

You can also use `defined?(@result)` for the same idea.

**Rule of thumb:** Use `||=` only when the memoized result is always truthy.
