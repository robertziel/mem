### Ruby Open Classes & Monkey Patching

**Open classes (Ruby allows reopening ANY class):**
```ruby
class String
  def palindrome?
    self == self.reverse
  end
end
"racecar".palindrome?  # true
```

**Dangers of monkey patching:**
- Can break gems and standard library
- Name collisions between gems
- Hard to debug ("where did this method come from?")
- Implicit dependencies

**ActiveSupport does it extensively (but it's battle-tested):**
```ruby
2.days.ago
"hello".blank?
1.megabyte
```

**Rule of thumb:** Never monkey-patch in production code. ActiveSupport's extensions are the exception (widely used, well-tested). If you must add methods to core classes, use Refinements instead.
