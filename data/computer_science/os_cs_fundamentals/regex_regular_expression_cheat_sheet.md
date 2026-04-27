### Regex / Regular Expression Cheat Sheet

Regex describes text patterns.

### Basic elements

- `abc` -> matches the literal text `abc`
- `.` -> any single character except newline in many engines
- `\` -> escapes a special character or starts a special sequence

### Character classes

- `[abc]` -> one character: `a`, `b`, or `c`
- `[^abc]` -> one character except `a`, `b`, or `c`
- `[a-z]` -> one lowercase letter from `a` to `z`
- `[A-Z]` -> one uppercase letter
- `[0-9]` -> one digit

### Common shorthand classes

- `\d` -> digit
- `\D` -> non-digit
- `\w` -> word character: letter, digit, or underscore
- `\W` -> non-word character
- `\s` -> whitespace
- `\S` -> non-whitespace

### Anchors

- `^` -> start of line or string
- `$` -> end of line or string
- `\A` -> start of string
- `\z` -> end of string
- `\b` -> word boundary
- `\B` -> not a word boundary

### Quantifiers

- `*` -> zero or more
- `+` -> one or more
- `?` -> zero or one
- `{3}` -> exactly 3 times
- `{2,5}` -> from 2 to 5 times
- `{2,}` -> at least 2 times

### Greedy vs lazy

- `.*` -> greedy, takes as much as possible
- `.*?` -> lazy, takes as little as possible

### Groups

- `(abc)` -> capturing group
- `(?:abc)` -> non-capturing group
- `(a|b)` -> group with alternatives

### Alternation

- `a|b` -> matches `a` or `b`

### Useful examples

- `\d+` -> one or more digits
- `^[A-Z][a-z]+$` -> whole string: capitalized word
- `^\w+@\w+\.\w+$` -> very simple email-like pattern

### Common flags

- `i` -> case-insensitive
- `m` -> multiline
- `x` -> ignore whitespace/comments in pattern in engines that support it

### Important gotchas

- `.` usually does not match newline unless the engine/flag allows it.
- Regex syntax differs slightly by language and engine.
- A pattern can be valid but still be too broad for real validation.

**Rule of thumb:** Build regex from small parts: anchor it, define allowed characters, then add only the quantifiers and groups you actually need.
