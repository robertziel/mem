### Ruby Refinements (Safe Scoped Extensions)

```ruby
module StringExtensions
  refine String do
    def shout
      upcase + "!!!"
    end
  end
end

# Without `using`: "hello".shout raises NoMethodError

class MyClass
  using StringExtensions  # activate in this scope only

  def greet
    "hello".shout  # "HELLO!!!" — works here
  end
end

"hello".shout  # NoMethodError — doesn't leak outside
```

**Refinements vs monkey patching:**
| Feature | Monkey patch | Refinement |
|---------|-------------|-----------|
| Scope | Global (everywhere) | Lexical (only where `using` is called) |
| Side effects | Affects all code | No global side effects |
| Safety | Dangerous | Safe |

**Rule of thumb:** Refinements for scoped extensions of core classes. No global side effects. Use when you need to add methods to String/Array/Hash in a specific module without affecting the rest of the application.
