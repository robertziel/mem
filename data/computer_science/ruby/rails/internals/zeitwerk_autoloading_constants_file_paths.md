### Rails — Zeitwerk Autoloading

**Definition:** **Zeitwerk** is Rails' code loader (default since 6.0). It maps **file paths to constant names** strictly: `app/models/user.rb` defines `User`. No more `require_relative` salad.

**Path → constant mapping:**

| File path | Constant |
|---|---|
| `app/models/user.rb` | `User` |
| `app/models/admin/user.rb` | `Admin::User` |
| `app/controllers/admin/users_controller.rb` | `Admin::UsersController` |
| `app/services/billing/charge_service.rb` | `Billing::ChargeService` |
| `app/lib/api/v2/payments_client.rb` | `Api::V2::PaymentsClient` |
| `lib/foo/bar.rb` (if `lib` autoloaded) | `Foo::Bar` |

**One file = one constant** (the rule):

| File contains | Result |
|---|---|
| Exactly the expected constant | ✅ Loads |
| Different constant name | ❌ `NameError` on autoload |
| Multiple constants nested correctly | ✅ Allowed (e.g. inner classes) |
| Two files defining same constant | ❌ Conflict; Zeitwerk fails to boot |

**Acronyms / inflections:**

```ruby
# config/initializers/inflections.rb
ActiveSupport::Inflector.inflections(:en) do |inflect|
  inflect.acronym "API"
  inflect.acronym "JSON"
  inflect.acronym "HTML"
end

# Then:
# app/lib/api/v2/json_serializer.rb → API::V2::JSONSerializer
```

| Without inflection | With acronym |
|---|---|
| `api/v2/json_serializer.rb` → `Api::V2::JsonSerializer` | `API::V2::JSONSerializer` |
| `html_parser.rb` → `HtmlParser` | `HTMLParser` |

> Set acronyms in `config/initializers/inflections.rb`. Tell Zeitwerk how the file maps if you must.

**Eager-load vs autoload — the two modes:**

| Mode | When | Behavior |
|---|---|---|
| **Autoload** | Default development | Constants load **on first reference** |
| **Eager load** | Default production / test | All constants loaded at boot |
| `config.eager_load = true` | Production | Catches missing constants at boot, not first request |
| `config.cache_classes = true` | Production | No reload between requests |

**Why eager load in production:**

| Win | Detail |
|---|---|
| Detect autoloading errors at boot | Won't 500 mid-request on missing file |
| Memory shared across forks | Copy-on-write friendly |
| Predictable startup | No "first request" warmup spike |
| CI catches problems | Fail at boot in test env too |

**Reloading in development:**

| Property | Detail |
|---|---|
| Code change → constant reloaded | Zeitwerk + ActiveSupport::Reloader |
| `bin/rails console` reload! | Manual reload |
| Some objects pinned | E.g. constants captured into class variables |
| `Rails.application.reloader.wrap` | Reload-aware blocks |

**Configuring autoload paths:**

```ruby
# Rails autoloads everything under app/* by default
# Add custom paths in config/application.rb:

config.autoload_paths << Rails.root.join("lib")
config.eager_load_paths << Rails.root.join("lib")

# OR use the modern helper:
config.autoload_lib(ignore: %w(generators tasks))
```

| Setting | Effect |
|---|---|
| `autoload_paths` | Available for autoload |
| `eager_load_paths` | Loaded at boot in production |
| `autoload_once_paths` | Loaded once, never reloaded (vendored libs) |
| `autoload_lib` | Modern shortcut for `lib/` |

**Common errors and fixes:**

| Error | Likely cause | Fix |
|---|---|---|
| `expected file X to define constant Y, but didn't` | Mismatched filename / class name | Rename file or class |
| `expected to define X but didn't` | Empty file or wrong constant defined | Check inside the file |
| `tried to autoload X but...` | Acronym not registered | Add inflection |
| `NameError: uninitialized constant X` after rename | Autoloader cached old name | Restart server, check git for stale references |
| `The autoloader has expanded the load path` | Old gem with wrong structure | Wrap with `concern :ignored` or update gem |
| `Zeitwerk::NameError` at boot | Bad file → constant mapping | `bin/rails zeitwerk:check` |

**Diagnostic command:**

```bash
bin/rails zeitwerk:check
```

| Output | Meaning |
|---|---|
| "All is good" | All mappings valid |
| Errors listed | Specific files / constants to fix |

**Patterns that need care:**

| Pattern | Detail |
|---|---|
| **Concerns** | `app/models/concerns/searchable.rb` → `Searchable`; modules included into models |
| **Class autoloading inside engines** | Each engine has its own autoload paths |
| **STI subclasses** | All loaded only when first referenced — eager-load to be safe |
| **Class reloading mid-request** | Don't capture classes in module-level constants |
| **Sidekiq workers** | Need eager-loaded classes for proper deserialization |
| **GraphQL types** | Often eager-load required so the schema builds fully |

**`Rails.autoloaders` API:**

```ruby
Rails.autoloaders.main         # Zeitwerk::Loader for the app
Rails.autoloaders.once         # Loader for autoload_once_paths
Rails.autoloaders.logger       # Set a logger to debug
Rails.autoloaders.main.logger = ->(msg) { puts msg }
```

| Use | Detail |
|---|---|
| Debug autoload | Turn on logger |
| Inspect paths | `Rails.autoloaders.main.dirs` |
| Check loaded constants | `Rails.autoloaders.main.loaded?` |

**Project structure conventions:**

| Directory | What goes there | Namespace? |
|---|---|---|
| `app/models/` | ActiveRecord models | None (top-level) |
| `app/controllers/` | Controllers | None (top-level) |
| `app/services/` | Service objects | None — but team conventions vary |
| `app/services/billing/` | Sub-namespace | `Billing::*` |
| `app/lib/` | Pure Ruby utilities | `App` namespace? Often top-level |
| `lib/tasks/` | Rake tasks | Not autoloaded |
| `app/jobs/` | ActiveJob | None |
| `app/decorators/` | Presenter / decorator pattern | None |

**Migration checklist (legacy `classic` autoloader → Zeitwerk):**

| Step | Detail |
|---|---|
| 1 | `bin/rails zeitwerk:check` — see violations |
| 2 | Rename files to match constants |
| 3 | Add inflections for acronyms |
| 4 | Move stray top-level constants into proper files |
| 5 | Remove manual `require` / `require_relative` |
| 6 | Verify in production-like env |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Defining a constant in a file that doesn't match its name | Boot error |
| Two constants in one file (top-level) | Conflict |
| `require` instead of relying on autoload | Constant defined twice in some envs |
| Acronym without inflection | Class name disagrees with file name |
| Module file empty (just nesting) | Use `module Foo; end` explicitly to anchor |
| Anchoring constants at module load | Lost on reload |
| `autoload :Foo, "foo"` (Ruby's `Module#autoload`) | Don't mix with Zeitwerk |
| Capturing class in instance var | Stale after reload — reference via `self.class` |

**Cross-references:**

- Rails request lifecycle: [request_lifecycle_*.md](../activerecord/request_lifecycle_rack_router.md)
- Engines & mountable apps: [engines_*.md](engines_mountable_apps_isolation.md)
- Class vs Module: [class_vs_module.md](../../core/class_vs_module.md)

**Rule of thumb:** **One file, one constant, matching path.** `app/models/admin/user.rb` defines `Admin::User` — no more, no less. Use `bin/rails zeitwerk:check` to verify, **register inflections** for acronyms (`API`, `JSON`, `HTML`), and **eager-load in production** so autoload errors fail at boot, not at 3am. Avoid `require` for app code — let the autoloader do its job.
