### Symbols vs. Strings (short)

**Symbols** (`:name`)
- Immutable, often used as identifiers/keys.
- Reused in memory (same object for same symbol).

**Strings** (`"name"`)
- Mutable text data.
- Different objects unless frozen.

**Rule of thumb:**
- Use **symbols** for keys, enums, or identifiers.
- Use **strings** for user-facing or changeable text.

```ruby
:status.object_id == :status.object_id  # true
"status".object_id == "status".object_id # false
```
