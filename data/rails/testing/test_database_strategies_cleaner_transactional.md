### Test Database Strategies (DatabaseCleaner, Transactional, Parallel)

**Why database cleaning matters:**
- Tests must start with a known state (empty or seeded)
- Leftover data from one test can cause another to fail
- Different strategies have different speed and reliability tradeoffs
- Choosing wrong strategy = flaky tests or slow suite

**Strategy comparison:**
| Strategy | How it works | Speed | Use when |
|----------|-------------|-------|----------|
| Transaction | Wraps each test in a rollback | Fastest | Default for most tests |
| Truncation | TRUNCATE TABLE after each test | Slow | Tests with multiple DB connections |
| Deletion | DELETE FROM after each test | Medium | Like truncation, respects foreign keys |

**Transactional tests in RSpec (default):**
```ruby
# spec/rails_helper.rb
RSpec.configure do |config|
  config.use_transactional_fixtures = true
  # Each test runs inside a DB transaction
  # After the test, the transaction is rolled back
  # Data never actually commits to the DB
  # This is the fastest strategy
end

# How it works internally:
# BEGIN TRANSACTION
#   -- your test creates records, runs queries
# ROLLBACK
# Result: database is clean, no data left behind

# Example test -- data is automatically cleaned up
describe User do
  it "validates email" do
    user = User.create!(name: "Alice", email: "alice@example.com")
    # This record is rolled back after the test
    expect(user).to be_persisted
  end
end
```

**When transactional tests break:**
```ruby
# Problem: code uses a DIFFERENT database connection
# Transactions only rollback on the connection that started them

# Scenario 1: System tests with a real browser
# The browser (Capybara + Selenium) makes HTTP requests
# The server handles requests on a DIFFERENT thread/connection
# Server can't see data created in the test's transaction

# Scenario 2: Background jobs tested inline
# Some job processors use separate connections

# Scenario 3: Multiple databases
# Each database has its own connection and transaction

# Solution: Use truncation for these cases
```

**DatabaseCleaner gem:**
```ruby
# Gemfile
gem "database_cleaner-active_record", group: :test

# spec/support/database_cleaner.rb
RSpec.configure do |config|
  config.use_transactional_fixtures = false  # let DatabaseCleaner handle it

  config.before(:suite) do
    DatabaseCleaner.clean_with(:truncation)  # start fresh
  end

  config.before(:each) do
    DatabaseCleaner.strategy = :transaction  # fast default
  end

  config.before(:each, type: :system) do
    DatabaseCleaner.strategy = :truncation   # system tests need truncation
  end

  config.before(:each, js: true) do
    DatabaseCleaner.strategy = :truncation   # JavaScript tests need truncation
  end

  config.before(:each) do
    DatabaseCleaner.start
  end

  config.after(:each) do
    DatabaseCleaner.clean
  end
end
```

**DatabaseCleaner strategies in detail:**
```ruby
# Transaction (fastest)
DatabaseCleaner.strategy = :transaction
# Uses BEGIN/ROLLBACK -- data never hits disk
# Only works when test and app share the same DB connection

# Truncation (slowest, most reliable)
DatabaseCleaner.strategy = :truncation
# Issues TRUNCATE TABLE for each table
# Resets auto-increment sequences
# Works across connections
# Can exclude tables:
DatabaseCleaner.strategy = :truncation, { except: %w[spatial_ref_sys] }

# Deletion (middle ground)
DatabaseCleaner.strategy = :deletion
# Issues DELETE FROM for each table
# Respects foreign key constraints (TRUNCATE may not)
# Does NOT reset auto-increment sequences
# Slightly faster than truncation for small datasets
DatabaseCleaner.strategy = :deletion, { except: %w[countries] }

# Pre-count optimization (skip clean tables)
DatabaseCleaner.strategy = :truncation, { pre_count: true }
# Only truncates tables that have rows -- big speedup
```

**Multiple databases with DatabaseCleaner:**
```ruby
# Clean multiple databases
DatabaseCleaner[:active_record, { connection: :primary }].strategy = :transaction
DatabaseCleaner[:active_record, { connection: :analytics }].strategy = :truncation

# Or configure with model
DatabaseCleaner[:active_record, { model: AnalyticsRecord }].strategy = :truncation
```

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

**Rule of thumb:** Use transactional tests as the default -- they are the fastest and simplest. Switch to truncation only when your tests use multiple database connections (system tests with Selenium, multi-database setups). Use `parallel_tests` when your suite exceeds a few minutes. Use `build_stubbed` over `create` when you do not need records in the database. The goal is: transactions everywhere possible, truncation only where required.
