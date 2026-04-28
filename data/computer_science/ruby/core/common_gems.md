### Common Ruby / Rails Gems by Category

**Concern → recommended gem:**

| Concern | Default pick | Alternatives | Notes |
|---|---|---|---|
| **Authentication** | **Devise** | Authlogic, Sorcery | Devise is the de-facto choice; Sorcery is more lightweight |
| **Authorization** | **Pundit** | CanCanCan, Rolify | Pundit-style policies favored in modern Rails |
| **OAuth / SSO** | **OmniAuth** | Doorkeeper (provider) | OmniAuth = consumer; Doorkeeper = OAuth server |
| **API tokens / JWT** | **devise-jwt**, **rodauth-jwt** | jwt + custom | Pair with Devise or Rodauth |
| **Background jobs** | **Sidekiq** | GoodJob, Solid Queue, Resque, Delayed Job | Sidekiq for Redis; Solid Queue is Rails 8 default |
| **Job scheduling** | **sidekiq-cron** | rufus-scheduler, whenever | Cron-style schedules |
| **HTTP client** | **Faraday** | HTTParty, Typhoeus, Net::HTTP, http.rb | Faraday for adapter pattern + middlewares |
| **Pagination** | **Pagy** | Kaminari, will_paginate | Pagy is by far the fastest |
| **File uploads** | **Active Storage** (built-in) | Shrine, CarrierWave | Active Storage for most apps; Shrine for advanced |
| **Image processing** | **image_processing** + libvips | MiniMagick + ImageMagick | libvips faster + safer than ImageMagick |
| **PDFs** | **Prawn** (generation), **Grover** (HTML→PDF via Chromium) | wkhtmltopdf (deprecated), PDFKit | Grover for modern HTML-driven |
| **Excel / CSV** | **roo** (read), **caxlsx** (write), CSV (stdlib) | spreadsheet | |
| **Search** | **pg_search** (Postgres FTS), **searchkick** (Elasticsearch wrapper) | Elasticsearch direct, Meilisearch, Typesense | pg_search is enough for most apps |
| **Slug / friendly URLs** | **friendly_id** | stringex | |
| **Tagging** | **acts-as-taggable-on** | Postgres array column + indexed | |
| **State machines** | **AASM**, **state_machines** | workflow | |
| **Soft delete** | **discard**, **paranoia** | acts_as_paranoid | discard is the modern minimal choice |
| **Audit log** | **paper_trail**, **audited** | logidze | paper_trail is the canonical |
| **Comments / reactions** | **acts_as_votable** | rails-settings-cached | |
| **Settings / feature flags** | **flipper**, **rollout** | rails-settings-cached | Flipper for feature flags |
| **Encryption** | **rails-encrypted** (built-in), **lockbox** | attr_encrypted (legacy) | Active Record encryption since Rails 7 |
| **Form builders** | **simple_form**, **formtastic** | bare ERB | |
| **View components** | **ViewComponent** (GitHub) | Phlex, Cells | First-class component pattern |
| **HTTP caching** | **rack-cache**, **action-pack** built-ins | | |
| **Real-time** | **AnyCable**, **Action Cable** (built-in) | | AnyCable scales further |
| **Email delivery** | **Action Mailer** + Sendgrid / Mailgun / SES adapters | mail-gun, postmark | |
| **Transactional email previews** | **letter_opener** (dev) | mailtrap | |
| **Markdown** | **redcarpet**, **kramdown** | commonmarker | |
| **Money** | **money-rails** | | Decimal arithmetic + currency conversion |

**Performance & profiling:**

| Concern | Gem |
|---|---|
| N+1 detection | **bullet** |
| Per-request mini-profiler | **rack-mini-profiler** |
| CPU sampling profiler | **stackprof** |
| Memory profiler | **memory_profiler** |
| Comparison benchmarks | **benchmark-ips** |
| Boot / object profiling | **derailed_benchmarks** |
| Slow query log integration | **prosopite**, **rack-mini-profiler** |
| Production-safe sampler | **rbspy** (out-of-process) |

**Logging & observability:**

| Concern | Gem |
|---|---|
| Structured logging | **lograge** |
| JSON log format | **semantic_logger**, **rails_semantic_logger** |
| Sentry / error tracking | **sentry-rails**, **bugsnag**, **honeybadger**, **rollbar** |
| OpenTelemetry | **opentelemetry-sdk**, **opentelemetry-instrumentation-all** |
| Datadog | **ddtrace**, **dogstatsd-ruby** |
| New Relic | **newrelic_rpm** |
| Prometheus | **prometheus-client**, **yabeda-prometheus** |
| Custom metrics | **yabeda** |

**Testing:**

| Concern | Gem |
|---|---|
| Test framework | **RSpec** (default), Minitest (built-in) |
| Factories | **FactoryBot** |
| HTTP stubs | **WebMock**, **VCR** |
| Browser tests | **Capybara** + **Selenium** / **Cuprite** |
| System / E2E | **Capybara** with `playwright-ruby-client` for modern flows |
| API contract | **Pact** |
| Coverage | **simplecov** |
| Mutation testing | **mutant** |
| Lint test files | **rubocop-rspec** |
| Test database cleanup | **database_cleaner-active_record** |
| Time travel | ActiveSupport `travel`/`travel_to` (built-in) |
| Stub external time | **timecop** |

**Code quality / linting:**

| Concern | Gem |
|---|---|
| Style linter | **RuboCop** + extensions (rspec, rails, performance) |
| Type checking | **Sorbet**, **RBS** + **Steep** |
| Security static analysis | **Brakeman** |
| Dependency vuln scan | **bundler-audit** |
| Dead code | **debride** |
| Cyclomatic complexity | **flog**, **flay** |
| Documentation | **YARD** |

**Rails internals & dev tools:**

| Concern | Gem |
|---|---|
| Better errors page | **better_errors**, **binding_of_caller** (dev) |
| Debugger | **debug** (built-in), **byebug** (legacy), **pry** + **pry-byebug** |
| Foreman / process manager (dev) | **foreman**, **overmind** |
| Live reload | **hotwire** (modern), **listen** + **rerun** |
| Annotate models with schema | **annotate** |
| ER-diagram from schema | **rails-erd** |
| Generate seeds | **seed-fu**, **seedbank** |
| Console enhancements | **awesome_print**, **amazing_print** |

**APIs & serialization:**

| Concern | Gem |
|---|---|
| JSON serialization | **jbuilder** (built-in), **fast_jsonapi**, **alba**, **panko_serializer** |
| GraphQL | **graphql-ruby** |
| OpenAPI / Swagger | **rswag** (RSpec → spec) |
| API versioning | **versionist** |
| HAL / JSON:API | **roar**, **fast_jsonapi** |

**Background processing patterns:**

| Concern | Gem |
|---|---|
| Reliable jobs (queue + retry) | **Sidekiq Pro/Enterprise** for batches |
| Outbox pattern | **transactional_outbox** style; or DIY with Active Record |
| Cron-like schedules | **sidekiq-cron**, **whenever** (writes crontab) |
| Job uniqueness | **sidekiq-unique-jobs** |
| Concurrency control | **sidekiq-throttled** |

**Database:**

| Concern | Gem |
|---|---|
| Multi-DB / sharding | **octopus** (legacy), Rails 6+ multi-DB built-in |
| Connection pooling | **pgbouncer** (external), **ActiveRecord pool** built-in |
| MongoDB | **Mongoid** |
| Migrations on huge tables | **strong_migrations** (lints risky migrations) |
| Soft constraints | **active_record-strong_validations** |
| Bulk import | **activerecord-import** |
| ULID / UUID v7 PKs | **ulid-ruby**, custom |

**App servers (Rack-compatible):**

| Server | Strengths |
|---|---|
| **Puma** (default since Rails 5) | Threaded + multi-process; modern default |
| **Falcon** | Async (fiber-based); experimental |
| **Unicorn** | Multi-process forking; legacy stable |
| **Iodine** | Threaded + WebSocket |
| **Thin** | Eventmachine-based; legacy |

**Front-end / asset pipeline (modern):**

| Concern | Gem / Tool |
|---|---|
| JavaScript bundling | **importmap-rails** (default), **jsbundling-rails** (esbuild/rollup/webpack) |
| CSS bundling | **cssbundling-rails** (Tailwind / Sass / Bootstrap) |
| Tailwind | **tailwindcss-rails** |
| Stimulus | **stimulus-rails** |
| Turbo (Hotwire) | **turbo-rails** |
| ViewComponent | **view_component** |

**Common pitfalls / gotchas:**

| Concern | Detail |
|---|---|
| ImageMagick CVE history | Prefer libvips via `image_processing` |
| Paperclip is unmaintained | Migrate to Active Storage or Shrine |
| `nokogiri` system libraries | Native compile fails on minimal containers — install `libxml2-dev` |
| `bcrypt` performance | High cost factor = slow login; tune `Rails.application.config.bcrypt_cost` |
| `redis-rb` vs `hiredis` | Add `hiredis` for faster parsing |
| `oj` vs default JSON | `oj` faster; require explicitly: `MultiJson.use :oj` |
| `pg_search` for fuzzy search at scale | Move to Elasticsearch when query patterns broaden |
| Spring + multi-DB confusion | Disable Spring if odd preload behavior |

**Quick checklist for a new Rails app:**

| Check | Pass? |
|---|---|
| **Devise** or **Rodauth** for auth | ✅ |
| **Pundit** for authorization | ✅ |
| **Sidekiq** or **Solid Queue** for background jobs | ✅ |
| **Pagy** for pagination | ✅ |
| **bullet** in dev for N+1 detection | ✅ |
| **rack-mini-profiler** in dev/admin-prod | ✅ |
| **Brakeman** + **bundler-audit** in CI | ✅ |
| **RuboCop** + **rubocop-rspec** lint | ✅ |
| **strong_migrations** to lint dangerous migrations | ✅ |
| **lograge** + Sentry for prod observability | ✅ |
| **simplecov** for coverage | ✅ |
| **Faraday** for HTTP with retry middleware | ✅ |

**Rule of thumb:** stick to **community-default gems** (Devise / Pundit / Sidekiq / Pagy / Brakeman) — they're battle-tested and well-documented. Reach for niche alternatives only when you've outgrown the default. **Profile with rack-mini-profiler + bullet + stackprof** before optimizing. **Brakeman + bundler-audit + strong_migrations** are non-negotiable in CI for any Rails project that touches production data.
