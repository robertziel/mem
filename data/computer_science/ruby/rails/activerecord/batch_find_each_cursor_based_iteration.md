### Batch Processing: find_each and Cursor-Based Iteration

**Problem:** Loading millions of records at once kills memory and performance. You need strategies to process large datasets efficiently.

**1. find_each / find_in_batches / in_batches -- ActiveRecord basics:**
```ruby
# Bad: Loads ALL records into memory at once
User.where(active: true).each { |user| process(user) }  # 10M users = OOM

# find_each -- loads in batches (default 1000), yields one at a time
User.where(active: true).find_each(batch_size: 5000) do |user|
  process(user)
end

# find_in_batches -- yields array of records per batch
User.where(active: true).find_in_batches(batch_size: 5000) do |batch|
  # Bulk operations on the batch
  emails = batch.map(&:email)
  EmailService.send_bulk(emails)
end

# in_batches -- yields ActiveRecord::Relation per batch (most flexible)
User.where(active: true).in_batches(of: 5000) do |relation|
  # Can do bulk updates without instantiating objects
  relation.update_all(notified: true)
end

# Notes on find_each:
# - Already cursor-based: uses WHERE id > last_id internally (NOT OFFSET)
# - Default order is PK ASC; Rails 7.1+ adds cursor:/order: options
#   User.find_each(cursor: :created_at, order: :desc) do |user| ... end
# - Cursor columns must be unique and stable (PK is the safe default)
```

**2. Manual cursor-based iteration (non-PK cursors, cross-DB portability):**
```ruby
# find_each already does cursor iteration on the primary key.
# Write a manual cursor when iterating by a non-PK column
# or when working around replica lag / long-running transactions.
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

**Rule of thumb:** Never `.each` over millions of records. Use `find_each` by default (already cursor-based on PK, not OFFSET), `find_in_batches` for array batches, `in_batches` for Relation-level bulk operations. Write a manual cursor only when you need to iterate by a non-PK column.
