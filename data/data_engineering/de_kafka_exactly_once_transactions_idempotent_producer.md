### Kafka Exactly-Once Semantics & Transactions

**Delivery guarantee levels:**
| Level | Behavior | Risk | Config |
|-------|----------|------|--------|
| At-most-once | Send and forget | Message loss | `acks=0` |
| At-least-once | Retry until ACK | Duplicates | `acks=all` (default) |
| Exactly-once | Each message processed once | None (complex) | Idempotent producer + transactions |

**Idempotent producer (deduplication on broker):**
```properties
# Producer config
enable.idempotence=true       # assigns ProducerID + sequence number
acks=all                       # required for idempotence
max.in.flight.requests.per.connection=5  # max for idempotence
```
- Broker detects duplicate writes (same ProducerID + sequence number)
- Prevents duplicates from retries (network timeout → retry → no duplicate)
- Per-partition deduplication only (not cross-partition)

**Transactions (atomic writes across topics/partitions):**
```java
// Producer
producer.initTransactions();
try {
    producer.beginTransaction();

    // Write to multiple topics atomically
    producer.send(new ProducerRecord<>("orders", key, orderEvent));
    producer.send(new ProducerRecord<>("inventory", key, inventoryEvent));

    // Commit consumer offsets in same transaction (read-process-write)
    producer.sendOffsetsToTransaction(offsets, consumerGroupId);

    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

```properties
# Producer config for transactions
transactional.id=my-app-instance-1   # unique per producer instance
enable.idempotence=true               # required for transactions
```

**Read-process-write (exactly-once stream processing):**
```
Consumer reads from topic A
  → Process message
  → Write result to topic B
  → Commit consumer offset for topic A

All three in ONE transaction:
  If any step fails → entire transaction aborted → no partial state
  Consumer re-reads from last committed offset → reprocesses
```

**Consumer isolation levels:**
```properties
# Consumer config
isolation.level=read_committed    # only see committed messages (exactly-once)
# isolation.level=read_uncommitted  # see all messages including uncommitted (default)
```
- `read_committed`: consumer skips messages from aborted transactions
- Required for end-to-end exactly-once

**Exactly-once pipeline:**
```
Producer (idempotent + transactional)
  → Broker (dedup by ProducerID + seq)
  → Consumer (read_committed isolation)
  → Process + Write + Commit offset (in transaction)

End-to-end exactly-once: each input message produces exactly one output.
```

**When exactly-once matters:**
| Use case | Need exactly-once? |
|----------|-------------------|
| Financial transactions | Yes (can't duplicate charges) |
| Inventory updates | Yes (can't double-decrement) |
| Analytics counters | No (at-least-once + dedup in DB is fine) |
| Log shipping | No (duplicates are acceptable) |
| Notifications | Maybe (idempotent consumer is simpler) |

**Idempotent consumer (alternative, simpler):**
```ruby
# Instead of exactly-once in Kafka, make consumer idempotent:
def process(message)
  return if already_processed?(message.offset, message.partition)

  # Process the message
  Order.create!(data: message.value, kafka_offset: message.offset)

  mark_processed(message.offset, message.partition)
end
```
- Store processed offset/message ID in your database
- Check before processing → skip duplicates
- Works with at-least-once delivery (simpler than transactions)

**Rule of thumb:** At-least-once + idempotent consumer is simplest and works for 90% of cases. Use Kafka transactions only when you need atomic read-process-write across topics. Enable `idempotence=true` always (no downside). `isolation.level=read_committed` for consumers that must not see uncommitted data.
