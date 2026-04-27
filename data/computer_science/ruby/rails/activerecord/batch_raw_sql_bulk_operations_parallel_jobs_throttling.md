### Batch Processing: Raw SQL, Bulk Operations, Parallel Jobs, and Throttling

**Raw SQL for maximum performance:**
```ruby
# When you don't need ActiveRecord objects -- skip instantiation entirely
# 10-50x faster than loading AR objects

# Pluck -- returns arrays of values (no AR objects)
User.where(active: true).in_batches(of: 10_000) do |relation|
  ids_and_emails = relation.pluck(:id, :email)
  ids_and_emails.each { |id, email| process_raw(id, email) }
end

# Raw SQL with cursor (PostgreSQL)
ActiveRecord::Base.connection.execute("DECLARE batch_cursor CURSOR FOR SELECT id, email FROM users WHERE active = true")
loop do
  results = ActiveRecord::Base.connection.execute("FETCH 5000 FROM batch_cursor")
  break if results.ntuples.zero?
  results.each { |row| process_raw(row["id"], row["email"]) }
end
ActiveRecord::Base.connection.execute("CLOSE batch_cursor")

# MySQL: use streaming with mysql2 gem
client = Mysql2::Client.new(host: "localhost", database: "mydb")
results = client.query("SELECT id, email FROM users WHERE active = true", stream: true, cache_rows: false)
results.each { |row| process_raw(row["id"], row["email"]) }
```

**Bulk operations -- update/insert without loading:**
```ruby
# Bulk update -- never load records just to update them
# Bad: N+1 updates
User.where(active: true).find_each { |u| u.update(notified: true) }

# Good: Bulk update
User.where(active: true).in_batches(of: 10_000) do |relation|
  relation.update_all(notified: true)
end

# Bulk insert (Rails 6+)
records = csv_data.map { |row| { name: row[:name], email: row[:email] } }
records.each_slice(5000) do |batch|
  User.insert_all(batch)                # skip validations/callbacks
  # or User.upsert_all(batch, unique_by: :email)  # insert or update
end

# Bulk delete
User.where("last_login < ?", 2.years.ago).in_batches(of: 10_000) do |relation|
  relation.delete_all  # SQL DELETE, no callbacks
  sleep(0.1)           # small pause to reduce DB load
end
```

**Parallel processing with jobs:**
```ruby
# Split work across multiple Sidekiq workers
class BatchProcessJob < ApplicationJob
  queue_as :batch

  def perform(start_id, end_id)
    User.where(id: start_id..end_id, active: true).find_each do |user|
      process(user)
    end
  end
end

# Enqueue batches
class DispatchBatchProcessing
  def self.call(batch_size: 10_000)
    min_id, max_id = User.where(active: true).pick(Arel.sql("MIN(id), MAX(id)"))
    return unless min_id && max_id

    (min_id..max_id).step(batch_size) do |start_id|
      end_id = [start_id + batch_size - 1, max_id].min
      BatchProcessJob.perform_later(start_id, end_id)
    end
  end
end

# With progress tracking
class BatchProcessJob < ApplicationJob
  def perform(start_id, end_id, batch_run_id)
    processed = 0
    User.where(id: start_id..end_id, active: true).find_each do |user|
      process(user)
      processed += 1
    end

    BatchRun.find(batch_run_id).increment!(:processed_count, processed)
  end
end
```

**Throttling -- don't overwhelm the database:**
```ruby
# Add pauses between batches to reduce DB pressure
User.where(active: true).in_batches(of: 5000) do |relation|
  relation.update_all(score: calculate_new_score)
  sleep(0.5)  # 500ms pause between batches
end

# Adaptive throttling based on replication lag
def process_with_throttle(scope, batch_size: 5000)
  scope.in_batches(of: batch_size) do |relation|
    yield relation

    # Check replication lag (MySQL)
    lag = ActiveRecord::Base.connection.execute(
      "SHOW SLAVE STATUS"
    ).first&.dig("Seconds_Behind_Master").to_i

    sleep(lag > 5 ? 2.0 : 0.1)  # back off if replica is falling behind
  end
end
```

**Rule of thumb:** Use `in_batches` + `update_all` for bulk updates (never load-modify-save). Use `pluck` when you don't need AR objects. Use `insert_all`/`upsert_all` for bulk inserts. Parallelize across Sidekiq jobs for throughput. Throttle with `sleep` between batches to protect the DB and monitor replication lag during large batch operations.
