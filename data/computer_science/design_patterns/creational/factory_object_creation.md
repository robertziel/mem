### Factory Pattern (Object Creation)

Decouple object creation from usage — decide which class to instantiate at runtime.

```ruby
class NotificationFactory
  def self.create(type)
    case type
    when :email then EmailNotification.new
    when :sms   then SmsNotification.new
    when :push  then PushNotification.new
    else raise "Unknown type: #{type}"
    end
  end
end

notification = NotificationFactory.create(:email)
notification.send(user, message)
```

**Rule of thumb:** Factory when you don't know the concrete class at compile time. In Ruby, often a simple `case` in a class method is enough (no need for abstract factory hierarchy).
