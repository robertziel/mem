### Bridge Pattern (Separate Abstraction from Implementation)

Decouple an abstraction from its implementation so both can vary independently.

```ruby
# Implementation (HOW to send)
class EmailSender
  def send(to, message) = puts "Email to #{to}: #{message}"
end

class SmsSender
  def send(to, message) = puts "SMS to #{to}: #{message}"
end

class PushSender
  def send(to, message) = puts "Push to #{to}: #{message}"
end

# Abstraction (WHAT to send)
class Notification
  def initialize(sender)
    @sender = sender
  end

  def notify(user, message)
    @sender.send(user.contact, message)
  end
end

class UrgentNotification < Notification
  def notify(user, message)
    @sender.send(user.contact, "[URGENT] #{message}")
  end
end

# Mix any abstraction with any implementation
UrgentNotification.new(SmsSender.new).notify(user, "Server down")
Notification.new(EmailSender.new).notify(user, "Weekly report")
```

**Bridge vs Strategy:** Bridge separates abstraction hierarchy from implementation hierarchy. Strategy swaps just the algorithm.

**Rule of thumb:** Bridge when both the "what" and the "how" have multiple variations. In Ruby, dependency injection often achieves the same effect more simply. Common in: notification systems, rendering engines, cross-platform libraries.
