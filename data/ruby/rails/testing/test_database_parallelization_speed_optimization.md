### Test Database Parallelization & Speed Optimization

**parallel_tests gem:**
```ruby
# Gemfile
gem "parallel_tests", group: [:development, :test]

# Setup: create multiple test databases
bin/rails parallel:setup
# Creates: myapp_test, myapp_test2, myapp_test3, myapp_test4

# Run tests in parallel
bundle exec parallel_rspec spec/
bundle exec parallel_rspec spec/ -n 4        # use 4 processes
bundle exec parallel_rspec spec/models/      # specific directory

# How it works:
# - Spawns N processes (default: number of CPU cores)
# - Each process uses a different test database (myapp_testN)
# - Tests are distributed across processes
# - Results are combined at the end

# config/database.yml
test:
  database: myapp_test<%= ENV["TEST_ENV_NUMBER"] %>
  # Process 1: myapp_test (no number)
  # Process 2: myapp_test2
  # Process 3: myapp_test3

# Rebuild parallel databases after migration
bin/rails parallel:prepare
```

**parallel_tests with DatabaseCleaner:**
```ruby
# spec/support/database_cleaner.rb
RSpec.configure do |config|
  config.before(:suite) do
    # Each parallel process cleans its own database
    DatabaseCleaner.clean_with(:truncation)
  end

  # Rest of config is the same -- each process runs independently
end
```

**Test database setup commands:**
```ruby
# Standard setup
bin/rails db:test:prepare       # recreate test DB from schema
bin/rails db:migrate RAILS_ENV=test  # run pending migrations on test DB

# Parallel setup
bin/rails parallel:setup        # create all parallel test DBs
bin/rails parallel:prepare      # prepare (migrate) all parallel test DBs
bin/rails parallel:drop         # drop all parallel test DBs

# Reset
bin/rails db:reset RAILS_ENV=test  # drop, create, migrate, seed
```

**System tests and database strategy:**
```ruby
# System tests REQUIRE truncation (or deletion) because
# the browser and test run on different connections

# spec/support/system_test_config.rb
RSpec.configure do |config|
  config.before(:each, type: :system) do
    driven_by :selenium_chrome_headless
    DatabaseCleaner.strategy = :truncation
  end
end

# Or with Rails built-in transactional support (Rails 5.1+)
# If your server and tests share a connection (Puma in single mode):
config.use_transactional_fixtures = true
# This works with Capybara when using the same thread
```

**Speed optimization tips:**
```ruby
# 1. Use transactions everywhere possible (fastest)
config.use_transactional_fixtures = true

# 2. Only use truncation where needed (system tests)
config.before(:each, type: :system) do
  DatabaseCleaner.strategy = :truncation
end

# 3. Use pre_count to skip clean tables
DatabaseCleaner.strategy = :truncation, { pre_count: true }

# 4. Exclude static/seed tables from cleaning
DatabaseCleaner.strategy = :truncation, {
  except: %w[countries states ar_internal_metadata]
}

# 5. Use build_stubbed instead of create when possible
# (avoids DB entirely)
user = build_stubbed(:user)  # never touches DB

# 6. Use parallel_tests for large suites
# 500 tests at 1 min -> 15 sec with 4 cores

# 7. Profile slow tests
RSpec.configure do |config|
  config.profile_examples = 10  # show 10 slowest tests
end
```

**Decision flowchart:**
```
Is this a system/feature test with a real browser?
  YES -> Use truncation
  NO  -> Is the code using multiple DB connections?
    YES -> Use truncation
    NO  -> Use transaction (default, fastest)
```

**Rule of thumb:** Use `parallel_tests` when your suite exceeds a few minutes -- it can cut a 4-minute suite to under 1 minute on 4 cores. Use `build_stubbed` over `create` when you do not need records in the database. Profile the 10 slowest tests regularly. The goal is: transactions everywhere possible, truncation only where required, and parallelism for the overall suite.
