### DDT (Data-Driven Testing) (short)

Tests are run with multiple input datasets to validate behavior across scenarios.

```ruby
cases = [
  { input: 1, expected: 2 },
  { input: 2, expected: 4 }
]

cases.each do |c|
  expect(double(c[:input])).to eq(c[:expected])
end
```

**Rule of thumb:** keep datasets small and focused on edge cases.
