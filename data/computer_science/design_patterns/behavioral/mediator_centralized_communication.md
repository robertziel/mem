### Mediator Pattern (Centralized Communication)

Objects communicate through a central mediator instead of directly, reducing coupling.

```ruby
class ChatRoom  # Mediator
  def initialize
    @users = []
  end

  def join(user)
    @users << user
    user.room = self
    broadcast(user, "#{user.name} joined")
  end

  def send_message(sender, message)
    @users.each do |user|
      next if user == sender
      user.receive(sender.name, message)
    end
  end

  private

  def broadcast(sender, message)
    send_message(sender, message)
  end
end

class User
  attr_reader :name
  attr_accessor :room

  def initialize(name) = @name = name
  def send(message) = room.send_message(self, message)
  def receive(from, message) = puts "[#{name}] #{from}: #{message}"
end

room = ChatRoom.new
alice = User.new("Alice")
bob = User.new("Bob")
room.join(alice)
room.join(bob)
alice.send("Hello!")  # Bob receives: "Alice: Hello!"
```

**Real-world examples:** Chat rooms, event buses, air traffic control, Redux store (single source of truth mediating component communication).

**Rule of thumb:** Mediator when many-to-many communication becomes spaghetti. Centralizes the interaction logic. Tradeoff: mediator can become a God object. Similar to Observer but mediator contains the logic, while Observer just notifies.
