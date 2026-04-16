### Rails Asset Precompilation & CI/CD

**Asset precompilation:**
```bash
RAILS_ENV=production bundle exec rails assets:precompile
# Compiles: Sprockets or Propshaft → fingerprinted files in public/assets/
```

**CI/CD pipeline (GitHub Actions):**
```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - run: bundle exec rails db:setup
      - run: bundle exec rspec
      - run: bundle exec rubocop
```

**Database migrations in CI/CD:**
```bash
# Run BEFORE deploying new code (backward compatible)
bundle exec rails db:migrate

# Use strong_migrations gem to catch unsafe migrations
gem 'strong_migrations'
```

**Rule of thumb:** Precompile assets in CI (not on servers). Run migrations before deploying new code. Use `strong_migrations` to catch unsafe DDL. Cache bundler in CI for speed.
