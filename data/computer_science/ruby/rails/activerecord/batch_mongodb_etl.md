### Batch Processing: MongoDB and ETL Patterns

**MongoDB batch processing:**
```ruby
# Mongoid: each_with_batches doesn't exist -- use raw driver
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

**ETL pattern -- extract, transform, load:**
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

**Rule of thumb:** In MongoDB, use `batch_size` on cursors and `bulk_write` for batch mutations. For ETL migrations, follow the extract-transform-load pattern with `in_batches`, `pluck` for extraction, and `insert_all` for loading. Always track progress and mark records as processed to enable safe restarts.
