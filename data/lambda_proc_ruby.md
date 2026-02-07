### Definition

Short explanation: both are callable blocks, but `lambda` behaves like a strict method and `proc` behaves like a flexible block.

* **lambda**: an anonymous function that behaves like a method
* **proc**: a callable block that behaves like a Ruby block

---

### Key differences (short)

| Feature   | lambda              | proc                          |
| --------- | ------------------- | ----------------------------- |
| Arguments | strict              | loose                         |
| `return`  | returns from itself | returns from enclosing method |

---

### Small examples

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
👉 *Use `lambda` for logic, `proc` for block-like control flow.*
