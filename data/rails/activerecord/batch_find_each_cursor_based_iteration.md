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

**Rule of thumb:** Never `.each` over millions of records. Use `find_each` by default for iterating one record at a time, `find_in_batches` when you need the batch as an array, and `in_batches` when you want an ActiveRecord::Relation for bulk operations. Switch to cursor-based iteration for tens of millions of rows where OFFSET becomes slow.
