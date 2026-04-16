### Test Database Cleaning: Transactional vs Truncation Strategies

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

**Rule of thumb:** Use transactional tests as the default -- they are the fastest and simplest. Switch to truncation only when your tests use multiple database connections (system tests with Selenium, multi-database setups). Use DatabaseCleaner to mix strategies per test type, and always use `pre_count: true` with truncation to skip already-clean tables.
