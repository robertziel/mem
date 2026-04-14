### `require` vs. `load` vs. `require_relative` (short)

- **`require`** loads a file once (cached in `$LOADED_FEATURES`).
- **`load`** loads a file every time it’s called.
- **`require_relative`** loads relative to the current file’s directory.

```ruby
require "json"            # loads once
load "config.rb"          # reloads on every call
require_relative "./utils" # relative path
```

**Rule of thumb:**
- Use `require` for gems/libs.
- Use `require_relative` for project files.
- Use `load` for reloading in dev or scripting.
