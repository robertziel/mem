### Blocks vs lambda vs proc

Short explanation:

- A **block** is Ruby syntax attached to a method call; it is not an object by itself.
- A **proc** is a callable object that behaves like a Ruby block.
- A **lambda** is a callable object that behaves more like a strict method.

You can turn a block into an object with `&block` or `to_proc`.

---

### Key differences (short)

| Feature   | lambda              | proc                          |
| --------- | ------------------- | ----------------------------- |
| Arguments | strict              | loose                         |
| `return`  | returns from itself | returns from enclosing method |

---

### Small examples

**Block**

```ruby
def greet
  yield "hi"
end

greet { |msg| puts msg }
```

**Arguments**

```ruby
l = ->(a, b) { a + b }
l.call(1)      # ❌ ArgumentError

p = Proc.new { |a, b| a.to_i + b.to_i }
p.call(1)      # ✅ 1
```

**Return**

```ruby
def test_lambda
  -> { return 1 }.call
  2
end
# => 2

def test_proc
  Proc.new { return 1 }.call
  2
end
# => 1
```

**Rule of thumb:**
Use `lambda` for method-like logic, `proc` for block-like behavior, and plain blocks when a method naturally yields work.
