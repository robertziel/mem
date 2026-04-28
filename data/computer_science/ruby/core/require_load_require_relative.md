### Ruby — `require` vs `load` vs `require_relative` vs `autoload`

**Definition:** four ways Ruby brings code into a process. **`require`** loads once via `$LOAD_PATH`; **`load`** loads every time (no caching); **`require_relative`** uses path relative to current file; **`autoload`** defers loading until a constant is referenced.

**Side-by-side:**

| Mechanism | Path lookup | Loaded once? | When | Common use |
|---|---|---|---|---|
| **`require "foo"`** | `$LOAD_PATH` | **Yes** (cached in `$LOADED_FEATURES`) | Now | Gems, stdlib |
| **`require_relative "foo"`** | Relative to caller's `__dir__` | Yes | Now | Project files |
| **`load "foo.rb"`** | `$LOAD_PATH` | **No** — reloads every call | Now | Reloading scripts, dev consoles |
| **`autoload :Foo, "foo"`** | `$LOAD_PATH` | Yes | **On first reference to `Foo`** | Lazy library loading |

**Examples:**

```ruby
# Gems / stdlib (registered in $LOAD_PATH)
require "json"
require "active_record"

# Project file relative to current
require_relative "../lib/parser"

# Reloading in a dev console
load "config/initializers/dev.rb"

# Defer loading until used
autoload :Optional, "optional"
Optional::Helper.new   # NOW the file loads
```

**The `$LOAD_PATH` story:**

| Property | Detail |
|---|---|
| Global array of search directories | `$LOAD_PATH` (alias `$:`) |
| Bundler / RubyGems extend it | Each gem's `lib/` |
| Manual addition | `$LOAD_PATH.unshift File.expand_path("lib", __dir__)` |
| `require` walks it left-to-right | First match wins |
| Order matters | Conflicts win for earlier entries |

**`$LOADED_FEATURES` — the cache:**

```ruby
require "json"
$LOADED_FEATURES.grep(/json/).first
# => "/usr/local/.../json.rb" — recorded path

require "json"   # no-op; already in $LOADED_FEATURES
```

| Property | Detail |
|---|---|
| Stores **resolved path** | Absolute path |
| `require` skips files already there | Idempotent |
| `load` does NOT consult it | Always re-runs |

**`require` vs `require_relative` — when each fits:**

| Need | Use |
|---|---|
| Loading a gem (`require "rack"`) | `require` |
| Loading stdlib (`require "json"`) | `require` |
| File in your own project | **`require_relative`** |
| File whose location depends on `$LOAD_PATH` | `require` |
| Want path independence | `require` (with `$LOAD_PATH` setup) |
| Don't want to depend on `$LOAD_PATH` | `require_relative` |

**`load` — the rare-but-useful one:**

| Use case | Detail |
|---|---|
| Hot-reload during development | Old technique; superseded by Zeitwerk reloader |
| Dynamic config / scripts | Read fresh state each time |
| REPL workflow | `load "buffer.rb"` to reload |
| Plugin systems with re-evaluation | Unusual |

> **Rarely needed in app code.** Frameworks like Rails / Zeitwerk handle reloading.

**`autoload` — Ruby's built-in lazy load:**

```ruby
# Avoid loading dependencies until referenced
module BigLib
  autoload :Heavy, "big_lib/heavy"
  autoload :Light, "big_lib/light"
end

# Boot is fast; Heavy / Light load only on first use
BigLib::Heavy.new   # triggers require "big_lib/heavy"
```

| Property | Detail |
|---|---|
| Built into `Module#autoload` | Per-module declaration |
| Loads on first constant reference | Saves boot time |
| Not the same as Zeitwerk | Zeitwerk replaces this in Rails |
| Not thread-safe historically (fixed in modern Ruby) | OK in 3.x |

**Rails / Zeitwerk vs raw `require`:**

| Tool | Detail |
|---|---|
| **Zeitwerk** (Rails 6+) | Maps files → constants automatically; no `require` needed |
| Plain Ruby | You write `require_relative` for your own files |
| Gems | Always use `require "gem_name"` |
| Mixed | Inside a gem, prefer `require_relative` for siblings |

> In Rails app code: **don't `require` your own files.** Zeitwerk handles it. Use `require` only for gems and stdlib.

**Bundler interaction:**

```ruby
# Gemfile
gem "rack"
gem "json"

# In code
require "bundler/setup"   # tightens $LOAD_PATH to gemfile gems
require "rack"
require "json"

# OR with auto-require:
Bundler.require  # requires every gem listed in Gemfile
```

| Setting | Effect |
|---|---|
| `Bundler.setup` | Sets up `$LOAD_PATH`, no requires |
| `Bundler.require` | Setup + auto-require everything |
| Gemfile group | `gem "x", require: false` |

**Decision tree:**

```
Loading a gem?
   → require "gem"

Loading your own file from a Rails app?
   → DON'T — Zeitwerk autoloads

Loading your own file from a non-Rails project?
   → require_relative "path/to/file"

Need fresh load every time?
   → load "path"

Want to defer loading until first use?
   → autoload :Const, "path"  (or use Zeitwerk in Rails)
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `require "config"` instead of `require_relative` | Fails if `$LOAD_PATH` doesn't include current dir |
| Using `load` in production | Reloads every request — slow |
| Mixing `require` of your own files in Rails | Conflicts with Zeitwerk |
| Cyclic requires | Top of file constants undefined |
| `autoload` referencing a wrong file | NameError on first use |
| Forgetting Bundler `require: false` | Loads optional dep at boot |
| Path with extension vs without | `require "foo"` works; `require "foo.rb"` works; mixing causes double-load |
| Capitalization on case-insensitive FS | Works locally, fails in CI / containers |

**Two important environment knobs:**

| Variable | Effect |
|---|---|
| `RUBYLIB` | Adds dirs to `$LOAD_PATH` |
| `RUBYOPT` | Default Ruby command-line options |
| `BUNDLE_GEMFILE` | Custom Gemfile location |

**Cross-references:**

- Zeitwerk autoloading (Rails): [zeitwerk_*.md](../rails/internals/zeitwerk_autoloading_constants_file_paths.md)
- Class vs Module: [class_vs_module.md](class_vs_module.md)
- Common gems: [common_gems_*.md](../common_gems_*.md)

**Rule of thumb:** **`require` for gems and stdlib, `require_relative` for your own files in non-Rails projects, neither in Rails app code (Zeitwerk handles it).** Reach for **`load`** only in scripts / REPL workflows. **`autoload`** defers loading — useful in libraries with optional features, but Zeitwerk supersedes it in Rails.
