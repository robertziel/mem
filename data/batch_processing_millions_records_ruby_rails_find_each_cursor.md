### Batch Processing Millions of Records in Ruby/Rails

**Problem:** Loading millions of records at once kills memory and performance. You need strategies to process large datasets efficiently.

**1. find_each / find_in_batches — ActiveRecord basics:**
```ruby
# ❌ Loads ALL records into memory at once
User.where(active: true).each { |user| process(user) }  # 10M users = OOM

# ✅ find_each — loads in batches (default 1000), yields one at a time
User.where(active: true).find_each(batch_size: 5000) do |user|
  process(user)
end

# ✅ find_in_batches — yields array of records per batch
User.where(active: true).find_in_batches(batch_size: 5000) do |batch|
  # Bulk operations on the batch
  emails = batch.map(&:email)
  EmailService.send_bulk(emails)
end

# ✅ in_batches — yields ActiveRecord::Relation per batch (most flexible)
User.where(active: true).in_batches(of: 5000) do |relation|
  # Can do bulk updates without instantiating objects
  relation.update_all(notified: true)
end

# Limitations of find_each:
# - Orders by primary key (can't use custom ORDER BY)
# - Doesn't work well with custom sorting
# - Uses OFFSET under the hood (OK for most cases)
```

**2. Cursor-based iteration (avoid OFFSET for very large tables):**
```ruby
# For tens of millions of rows, OFFSET becomes slow
# (DB must scan and skip N rows each batch)

# Cursor-based: use WHERE id > last_id instead of OFFSET
def process_in_cursor_batches(scope, batch_size: 5000)
  last_id = 0

  loop do
    batch = scope.where("id > ?", last_id)
                 .order(:id)
                 .limit(batch_size)
                 .to_a

    break if batch.empty?

    yield batch
    last_id = batch.last.id
  end
end

process_in_cursor_batches(User.where(active: true)) do |batch|
  batch.each { |user| process(user) }
end

# For non-integer PKs (e.g., UUID), use a sortable column:
# WHERE created_at > last_created_at OR (created_at = last_created_at AND id > last_id)
```

**3. Raw SQL for maximum performance:**
```ruby
# When you don't need ActiveRecord objects — skip instantiation entirely
# 10-50x faster than loading AR objects

# Pluck — returns arrays of values (no AR objects)
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

**4. Bulk operations — update/insert without loading:**
```ruby
# Bulk update — never load records just to update them
# ❌ N+1 updates
User.where(active: true).find_each { |u| u.update(notified: true) }

# ✅ Bulk update
User.where(active: true).in_batches(of: 10_000) do |relation|
  relation.update_all(notified: true)
end

# ✅ Bulk insert (Rails 6+)
records = csv_data.map { |row| { name: row[:name], email: row[:email] } }
records.each_slice(5000) do |batch|
  User.insert_all(batch)                # skip validations/callbacks
  # or User.upsert_all(batch, unique_by: :email)  # insert or update
end

# ✅ Bulk delete
User.where("last_login < ?", 2.years.ago).in_batches(of: 10_000) do |relation|
  relation.delete_all  # SQL DELETE, no callbacks
  sleep(0.1)           # small pause to reduce DB load
end
```

**5. Parallel processing with jobs:**
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

**6. Throttling — don't overwhelm the database:**
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

**7. MongoDB batch processing:**
```ruby
# Mongoid: each_with_batches doesn't exist — use raw driver
# Use batch_size on the cursor
User.where(active: true).batch_size(5000).each do |user|
  process(user)
end

# MongoDB aggregation for bulk computation
User.collection.aggregate([
  { "$match" => { active: true } },
  { "$group" => { "_id" => "$region", "count" => { "$sum" => 1 } } }
]).each { |result| save_stat(result) }

# Bulk write operations (Mongoid)
bulk_ops = users_data.map do |data|
  { update_one: {
    filter: { _id: data[:id] },
    update: { "$set" => { score: data[:score] } }
  }}
end

User.collection.bulk_write(bulk_ops, ordered: false)  # unordered = parallel
```

**8. ETL pattern — extract, transform, load:**
```ruby
class DataMigration
  BATCH_SIZE = 10_000

  def call
    total = Source.where(migrated: false).count
    Rails.logger.info("Migrating #{total} records")

    processed = 0
    Source.where(migrated: false).in_batches(of: BATCH_SIZE) do |relation|
      # Extract
      records = relation.pluck(:id, :data, :created_at)

      # Transform
      transformed = records.map do |id, data, created_at|
        {
          source_id: id,
          normalized_data: normalize(data),
          imported_at: Time.current,
          original_date: created_at
        }
      end

      # Load
      Destination.insert_all(transformed)

      # Mark as migrated
      relation.update_all(migrated: true)

      processed += records.size
      Rails.logger.info("Progress: #{processed}/#{total} (#{(processed.to_f / total * 100).round(1)}%)")
    end
  end
end
```

**Performance comparison:**

| Method | Speed | Memory | Use when |
|--------|-------|--------|----------|
| `.each` | Slow | Very high | Never for large datasets |
| `find_each` | Moderate | Low | Default choice |
| `in_batches` + `update_all` | Fast | Very low | Bulk updates |
| `pluck` in batches | Fast | Low | Need only specific columns |
| Raw SQL cursor | Fastest | Lowest | Max performance needed |
| Parallel jobs | Fastest total | Low per job | Can parallelize |

**Rule of thumb:** Never `.each` over millions of records. Use `find_each` by default. Use `in_batches` + `update_all` for bulk updates (never load-modify-save). Use `pluck` when you don't need AR objects. Throttle with `sleep` between batches to protect the DB. Parallelize across Sidekiq jobs for throughput. Monitor replication lag during large batch operations.
