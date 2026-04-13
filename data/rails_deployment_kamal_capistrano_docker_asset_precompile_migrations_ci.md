### Rails Deployment (Kamal, Capistrano, Docker, CI/CD)

**Deployment options overview:**
| Tool | Approach | Best for | Complexity |
|------|----------|----------|------------|
| Kamal (MRSK) | Docker + SSH deploy | VPS/bare metal, full control | Medium |
| Capistrano | SSH + symlinks | Traditional servers, non-Docker | Medium |
| Docker + orchestrator | Containers + K8s/ECS | Cloud-native, scale | High |
| Heroku/Render | Git push PaaS | Small apps, quick deploy | Low |

**Kamal (formerly MRSK) -- Rails default since 8.0:**
```ruby
# Install
gem install kamal
kamal init

# config/deploy.yml
service: myapp
image: myuser/myapp

servers:
  web:
    hosts:
      - 192.168.0.1
      - 192.168.0.2
    options:
      memory: 512m
  job:
    hosts:
      - 192.168.0.3
    cmd: bundle exec sidekiq

registry:
  username: myuser
  password:
    - KAMAL_REGISTRY_PASSWORD

env:
  clear:
    RAILS_LOG_TO_STDOUT: true
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL

traefik:
  options:
    publish:
      - "443:443"
    volume:
      - "/letsencrypt:/letsencrypt"

healthcheck:
  path: /up
  port: 3000

# Deploy commands
kamal setup            # first-time setup (installs Docker, Traefik)
kamal deploy           # build, push, and deploy
kamal rollback         # roll back to previous version
kamal app logs         # view application logs
kamal app exec "bin/rails console"  # remote console
```

**Capistrano (traditional SSH deploy):**
```ruby
# Gemfile
gem "capistrano", "~> 3.18", group: :development
gem "capistrano-rails", group: :development
gem "capistrano-rbenv", group: :development
gem "capistrano-bundler", group: :development
gem "capistrano-passenger", group: :development

# Capfile
require "capistrano/setup"
require "capistrano/deploy"
require "capistrano/rbenv"
require "capistrano/bundler"
require "capistrano/rails/assets"
require "capistrano/rails/migrations"
require "capistrano/passenger"

# config/deploy.rb
lock "~> 3.18"
set :application, "myapp"
set :repo_url, "git@github.com:user/myapp.git"
set :deploy_to, "/var/www/myapp"
set :linked_dirs, %w[log tmp/pids tmp/cache tmp/sockets vendor/bundle storage]
set :linked_files, %w[config/master.key config/database.yml]
set :keep_releases, 5

# config/deploy/production.rb
server "192.168.0.1", user: "deploy", roles: %w[app db web]

# Deploy commands
cap production deploy           # full deploy
cap production deploy:rollback  # rollback
cap production rails:console    # remote console
```

**Docker-based deployment:**
```ruby
# Dockerfile (Rails 7.1+ generates this)
FROM ruby:3.3-slim AS base
WORKDIR /rails
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle"

# Build stage
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential libpq-dev
COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache

COPY . .
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile

# Final stage
FROM base
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /rails /rails

RUN useradd rails --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp
USER rails:rails

EXPOSE 3000
CMD ["./bin/rails", "server"]
```

**Asset precompilation:**
```ruby
# Precompile assets for production
RAILS_ENV=production bin/rails assets:precompile

# In Docker (with dummy secret key since DB isn't needed):
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile

# In CI pipeline:
- name: Precompile assets
  run: bin/rails assets:precompile
  env:
    RAILS_ENV: production
    SECRET_KEY_BASE_DUMMY: 1

# Asset pipeline outputs to public/assets/ with fingerprinted filenames
# application-a1b2c3d4.css, application-e5f6g7h8.js
# Old assets cleaned with: bin/rails assets:clobber
```

**Database migrations in CI/CD:**
```ruby
# Run migrations during deploy
bin/rails db:migrate

# CI/CD pipeline order:
# 1. Run tests
# 2. Build Docker image / precompile assets
# 3. Push image to registry
# 4. Run db:migrate on production
# 5. Deploy new code
# 6. Verify health check

# Safe migration practices:
class AddEmailIndexToUsers < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!  # required for concurrent index

  def change
    add_index :users, :email, unique: true, algorithm: :concurrently
  end
end

# Check for unsafe migrations:
# Gemfile
gem "strong_migrations"

# strong_migrations catches:
# - Adding an index without concurrently
# - Removing a column still referenced in code
# - Changing column type (locks table)
```

**Zero-downtime deployment:**
```ruby
# Key principles:
# 1. Migrate BEFORE deploying new code (backward-compatible migrations)
# 2. Two-phase column removal:
#    Deploy 1: Stop reading the column, add ignore
#    Deploy 2: Remove the column from DB

# Phase 1: Ignore the column
class User < ApplicationRecord
  self.ignored_columns += ["legacy_field"]
end

# Phase 2 (next deploy): Drop the column
class RemoveLegacyFieldFromUsers < ActiveRecord::Migration[7.1]
  def change
    remove_column :users, :legacy_field, :string
  end
end

# Kamal zero-downtime: built-in via Traefik rolling restart
# Capistrano: use phased restart with Puma
# Docker/K8s: rolling update strategy
```

**Health checks:**
```ruby
# Rails 7.1+ built-in health check
# GET /up returns 200 if the app is running

# Custom health check:
# config/routes.rb
get "/health", to: "health#show"

# app/controllers/health_controller.rb
class HealthController < ApplicationController
  skip_before_action :authenticate_user!

  def show
    ActiveRecord::Base.connection.execute("SELECT 1")
    Redis.current.ping
    head :ok
  rescue StandardError => e
    render json: { error: e.message }, status: :service_unavailable
  end
end
```

**CI/CD pipeline (GitHub Actions example):**
```yaml
# .github/workflows/deploy.yml
name: CI/CD
on:
  push:
    branches: [main]

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
      - run: bin/rails db:setup
        env:
          DATABASE_URL: postgres://postgres:password@localhost/test
      - run: bundle exec rspec

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: kamal deploy
        env:
          KAMAL_REGISTRY_PASSWORD: ${{ secrets.KAMAL_REGISTRY_PASSWORD }}
          RAILS_MASTER_KEY: ${{ secrets.RAILS_MASTER_KEY }}
```

**Heroku deployment (simplest option):**
```ruby
# Procfile
web: bundle exec puma -C config/puma.rb
worker: bundle exec sidekiq
release: bundle exec rails db:migrate  # runs before deploy

# Deploy
git push heroku main

# Heroku automatically:
# 1. Detects Ruby buildpack
# 2. Runs bundle install
# 3. Precompiles assets
# 4. Runs release command (db:migrate)
# 5. Starts web dynos
```

**Rule of thumb:** Use Kamal for new projects deploying to your own servers -- it is the Rails default and gives Docker benefits without Kubernetes complexity. Use Capistrano if you have existing non-Docker infrastructure. Use Heroku or Render for small apps or MVPs where speed matters more than cost. Always run migrations before deploying new code, use `strong_migrations` to catch unsafe changes, and implement health checks for zero-downtime deploys.
