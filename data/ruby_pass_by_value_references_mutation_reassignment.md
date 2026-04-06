### Ruby pass-by-value with references

Ruby is pass-by-value, but the value being passed is a reference to an object.

### What that means

- A method gets its own copy of the reference.
- It can mutate the object the reference points to.
- Reassigning the local parameter does not change the caller's variable.

### Example

```ruby
def mutate(arr)
  arr << 3
end

def reassign(arr)
  arr = [9, 9, 9]
end

nums = [1, 2]
mutate(nums)   # nums is now [1, 2, 3]
reassign(nums) # nums is still [1, 2, 3]
```

**Rule of thumb:** Methods can change the same object, but they cannot rebind the caller's variable.
