### Publish-Subscribe Pattern (Pub/Sub)

Decouple message producers from consumers via topics/channels.

```
Publisher → [Topic/Channel] → Subscriber A
                            → Subscriber B
                            → Subscriber C

Publisher doesn't know who subscribes.
Subscribers don't know who publishes.
```

```ruby
# In-memory pub/sub
class EventBus
  @subscribers = Hash.new { |h, k| h[k] = [] }

  def self.subscribe(event, &handler)
    @subscribers[event] << handler
  end

  def self.publish(event, data)
    @subscribers[event].each { |handler| handler.call(data) }
  end
end

EventBus.subscribe(:user_registered) { |user| WelcomeMailer.send(user) }
EventBus.subscribe(:user_registered) { |user| Analytics.track("signup", user) }
EventBus.publish(:user_registered, user)
```

**Implementations:**
| Tool | Scope | Persistence |
|------|-------|-------------|
| In-memory (above) | Single process | None |
| Redis Pub/Sub | Cross-process | None (fire and forget) |
| SNS | AWS cross-service | None |
| Kafka | Cross-service | Yes (replay) |
| EventBridge | AWS event routing | Archive optional |

**Pub/Sub vs Queue:**
- Pub/Sub: every subscriber gets every message (fan-out)
- Queue: each message consumed by ONE consumer (work distribution)

**Rule of thumb:** Pub/Sub for fan-out (one event, many reactors). Queue for work distribution (one task, one worker). Redis Pub/Sub for simple cross-process events. SNS+SQS for reliable fan-out with persistence.
