### Ruby Regex: Basics, Captures & gsub

**Basic matching:**
```ruby
# =~ returns index of first match (or nil)
"hello world" =~ /world/     # 6
"hello world" =~ /missing/   # nil

# match returns MatchData object (or nil)
result = "hello world".match(/world/)
result[0]    # "world" (full match)

# match? returns boolean (fastest, no MatchData allocation)
"hello world".match?(/world/)  # true
"hello world".match?(/xyz/)    # false

# Conditional on match
if "user@example.com" =~ /\A[\w.+-]+@[\w-]+\.[\w.]+\z/
  puts "valid email format"
end
```

**Capture groups:**
```ruby
# Unnamed groups with parentheses
result = "2025-01-15".match(/(\d{4})-(\d{2})-(\d{2})/)
result[0]  # "2025-01-15" (full match)
result[1]  # "2025" (first group)
result[2]  # "01" (second group)
result[3]  # "15" (third group)
result.captures  # ["2025", "01", "15"]

# Using $1, $2 globals (set after =~ or match)
"John Smith" =~ /(\w+)\s(\w+)/
$1  # "John"
$2  # "Smith"

# Destructuring captures
if /(\w+)\s(\w+)/ =~ "John Smith"
  puts first  # NoMethodError -- use $1 instead
end
```

**Named captures:**
```ruby
# Named groups with (?<name>...)
result = "2025-01-15".match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/)
result[:year]   # "2025"
result[:month]  # "01"
result[:day]    # "15"
result["year"]  # "2025" (string key also works)

# Named captures as local variables (only with literal regex on left of =~)
if /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/ =~ "2025-01-15"
  puts year   # "2025" (local variable!)
  puts month  # "01"
  puts day    # "15"
end

# Named captures in scan
"Call 555-1234 or 555-5678".scan(/(?<area>\d{3})-(?<number>\d{4})/)
# [["555", "1234"], ["555", "5678"]]
```

**gsub with regex:**
```ruby
# Simple replacement
"hello world".gsub(/world/, "Ruby")  # "hello Ruby"

# With back-references
"John Smith".gsub(/(\w+) (\w+)/, '\2, \1')  # "Smith, John"

# With block (full control)
"prices: $10 and $25".gsub(/\$(\d+)/) do |match|
  amount = $1.to_i
  "$#{amount * 2}"
end
# "prices: $20 and $50"

# With hash
"cat and dog".gsub(/cat|dog/, "cat" => "feline", "dog" => "canine")
# "feline and canine"

# sub replaces only the first match
"aabaa".sub(/a/, "x")   # "xabaa"
"aabaa".gsub(/a/, "x")  # "xxbxx"
```

**Rule of thumb:** Use `match?` for simple boolean checks (fastest). Use named captures `(?<name>...)` for readability when extracting multiple groups. Use `gsub` with a block for complex replacements. Always anchor patterns with `\A` and `\z` (not `^` and `$`) when validating entire strings, since `^`/`$` match line boundaries, not string boundaries.
