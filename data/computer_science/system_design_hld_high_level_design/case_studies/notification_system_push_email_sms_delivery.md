### System Design: Notification System

**Requirements:**
- Send notifications via push, email, SMS
- Support millions of users
- Delivery guarantees (at-least-once)
- User preferences (opt-in/out per channel)
- Rate limiting (don't spam users)
- Templating and personalization

**High-level design:**
```
Trigger (service/event)
  -> Notification Service (validate, check preferences, rate limit)
    -> Priority Queue (by channel + priority)
      -> Push Worker   -> APNs / FCM
      -> Email Worker  -> SES / SendGrid
      -> SMS Worker    -> Twilio / SNS
```

**Key components:**

**1. Notification Service (API):**
- Accepts notification requests from internal services
- Validates payload, checks user preferences, deduplicates
- Applies rate limiting per user per channel
- Enqueues to appropriate channel queue

**2. User Preferences Store:**
```
user_preferences:
  user_id       BIGINT
  channel       ENUM (push, email, sms)
  enabled       BOOLEAN
  quiet_hours   JSONB    # {start: "22:00", end: "08:00", tz: "US/Pacific"}
```

**3. Template Service:**
- Reusable templates with variable substitution
- Per-channel formatting (HTML for email, short text for SMS, structured for push)
- Localization support

**4. Delivery workers (per channel):**
- Pull from channel-specific queues
- Handle provider-specific logic (APNs payload, SMTP, Twilio API)
- Retry with exponential backoff
- Track delivery status (sent, delivered, bounced, failed)

**5. Analytics & tracking:**
- Delivery rate, open rate, click rate
- Bounce handling (remove invalid emails/tokens)
- Async logging via separate queue

**Data model:**
```
notifications:
  id              UUID PRIMARY KEY
  user_id         BIGINT
  type            VARCHAR (order_update, promo, alert)
  channel         VARCHAR (push, email, sms)
  status          ENUM (pending, sent, delivered, failed)
  template_id     VARCHAR
  payload         JSONB
  scheduled_at    TIMESTAMP
  sent_at         TIMESTAMP
  retry_count     INT DEFAULT 0
  created_at      TIMESTAMP
```

**Reliability patterns:**
- Idempotency key per notification (prevent duplicate sends)
- DLQ for failed deliveries after max retries
- Circuit breaker per provider (if Twilio is down, don't keep hammering)
- Fallback channels (push fails -> try email)

**Scaling:**
- Separate queues per channel (independent scaling)
- High-priority queue for critical alerts (2FA, security)
- Batch processing for marketing notifications (lower priority)
- Device token / email validation as separate background job

**Rule of thumb:** Separate queues per channel for independent scaling. Always check user preferences before sending. Deduplicate with idempotency keys. Use DLQ for failed deliveries. Priority queue for critical vs marketing.
