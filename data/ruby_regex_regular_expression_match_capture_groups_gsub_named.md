### Ruby Regular Expressions (Regex)

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

**Common regex patterns:**
```ruby
# Email (basic)
/\A[\w.+-]+@[\w-]+\.[\w.]+\z/

# URL
/\Ahttps?:\/\/[\S]+\z/

# IP address (v4)
/\A(\d{1,3}\.){3}\d{1,3}\z/

# Phone number (US)
/\A\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\z/

# Hex color
/\A#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\z/

# Strong password (8+ chars, upper, lower, digit, special)
/\A(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}\z/

# UUID
/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i

# Slug (URL-safe string)
/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
```

**Lookahead and lookbehind:**
```ruby
# Positive lookahead (?=...) -- match only if followed by
"100px 200em 300px".scan(/\d+(?=px)/)  # ["100", "300"]

# Negative lookahead (?!...) -- match only if NOT followed by
"100px 200em 300px".scan(/\d+(?!px)/)  # ["20", "0em"] (tricky!)
# Better: /\d+(?=em)/

# Positive lookbehind (?<=...) -- match only if preceded by
"$100 200 $300".scan(/(?<=\$)\d+/)  # ["100", "300"]

# Negative lookbehind (?<!...) -- match only if NOT preceded by
"$100 200 $300".scan(/(?<!\$)\b\d+/)  # ["200"]

# Practical example: extract value after a label
"name: Alice, age: 30".match(/(?<=name:\s)\w+/)[0]  # "Alice"
```

**Regex modifiers:**
```ruby
/pattern/i   # case insensitive
/pattern/m   # multiline (. matches newlines)
/pattern/x   # extended (allows comments and whitespace)

# Extended mode for readable regexes
PHONE = /
  \A
  \+?1?          # optional country code
  \s*            # optional whitespace
  \(?\d{3}\)?   # area code with optional parens
  [\s.-]?        # separator
  \d{3}          # exchange
  [\s.-]?        # separator
  \d{4}          # subscriber
  \z
/x

# Combine modifiers
/pattern/im  # case insensitive + multiline
```

**scan, split, and grep:**
```ruby
# scan -- find all matches
"a1b2c3".scan(/\d+/)          # ["1", "2", "3"]
"a1b2c3".scan(/([a-z])(\d)/)  # [["a", "1"], ["b", "2"], ["c", "3"]]

# split with regex
"one, two;  three".split(/[,;]\s*/)  # ["one", "two", "three"]
"camelCaseString".split(/(?=[A-Z])/) # ["camel", "Case", "String"]

# grep -- filter arrays by pattern
%w[apple banana avocado cherry].grep(/^a/)  # ["apple", "avocado"]

# grep_v -- inverse grep (Ruby 2.3+)
%w[apple banana avocado cherry].grep_v(/^a/)  # ["banana", "cherry"]
```

**Useful methods summary:**
| Method | Returns | Use for |
|--------|---------|---------|
| =~ | Integer or nil | Quick match check with index |
| match? | true/false | Boolean check (fastest) |
| match | MatchData or nil | Extracting captures |
| scan | Array | Finding all matches |
| gsub | String | Replace all matches |
| sub | String | Replace first match |
| split | Array | Split by pattern |
| grep | Array | Filter array by pattern |

**Performance tips:**
```ruby
# Precompile regex constants (avoid recompilation)
EMAIL_REGEX = /\A[\w.+-]+@[\w-]+\.[\w.]+\z/
value.match?(EMAIL_REGEX)

# Use match? when you only need boolean (no MatchData allocated)
# Slow: "text" =~ /pattern/   (creates $~, $1, etc.)
# Fast: "text".match?(/pattern/)

# Avoid catastrophic backtracking
# Bad:  /(a+)+b/     -- exponential time on "aaaaaaaaaaac"
# Good: /a+b/        -- linear time

# Use possessive quantifiers to prevent backtracking
/a++b/   # possessive: never backtracks on a+
```

**Rule of thumb:** Use `match?` for simple boolean checks (fastest). Use named captures `(?<name>...)` for readability when extracting multiple groups. Use `gsub` with a block for complex replacements. Use `/x` extended mode for any regex longer than 20 characters. Always anchor patterns with `\A` and `\z` (not `^` and `$`) when validating entire strings, since `^`/`$` match line boundaries, not string boundaries.
