### Store-and-Forward (SAF) — Offline Resilience

**Visa context:** When the network between terminal and acquirer is down, the POS terminal stores transactions locally in a FIFO queue and forwards them when connectivity returns. Ensures merchants can accept payments even during outages.

**How it works in VisaNet:**
```
Normal:   Terminal ──────> Acquirer ──────> VisaNet ──────> Issuer
                    real-time connection

Offline:  Terminal ──[SAF queue]──X──(no connection)
            │
            │  connectivity restored
            ▼
          Terminal ──────> Acquirer  (batch upload of queued transactions)
```

**SAF queue behavior:**
- FIFO order — first transaction queued = first uploaded
- Each queued transaction gets a SAF reference number
- Terminal attempts upload periodically (configurable interval, e.g., every 60s)
- Auto-upload when terminal returns to idle state
- Configurable max queue depth and max transaction age

**Transaction states in SAF:**
```
Eligible  → queued, waiting to send to host
Processed → host approved, transaction complete
Declined  → host declined, merchant must handle (e.g., void the sale)
Failed    → upload failed after max retries → move to exception queue
```

**General software pattern: Write-Ahead Log + Retry Queue**

```ruby
# Same pattern in your application:
class OutboxProcessor
  def process_pending
    OutboxEvent.where(status: "pending")
               .order(:created_at)         # FIFO
               .find_each do |event|
      begin
        ExternalService.send(event.payload)
        event.update!(status: "processed")
      rescue Faraday::ConnectionFailed
        event.increment!(:retry_count)
        if event.retry_count > MAX_RETRIES
          event.update!(status: "failed")
          DeadLetterQueue.add(event)
        end
      end
    end
  end
end
```

**Where you see this pattern:**
- Kafka producer buffering (linger.ms, batch.size)
- Sidekiq retry queue (jobs stored in Redis, retried on failure)
- Outbox pattern (events in DB table, polled and sent)
- Mobile apps (queue API calls offline, sync when connected)
- CDN edge caching (store requests, forward to origin)

**Rule of thumb:** Any system that must survive connectivity loss needs a local durable queue. Store transactions locally in FIFO order, upload when connection returns, handle declined/failed items as exceptions. Set max queue depth and max age to bound risk.
