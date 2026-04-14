### Action Cable: Setup, Connections & Channels

**What is Action Cable?**
Action Cable integrates WebSockets with Rails, enabling real-time features like chat, notifications, and live updates. It runs alongside your Rails app and uses channels for pub/sub communication.

**Connection authentication:**
```ruby
# app/channels/application_cable/connection.rb
module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      # Cookies are available in WebSocket connections
      if (user = User.find_by(id: cookies.encrypted[:user_id]))
        user
      else
        reject_unauthorized_connection
      end
    end
  end
end
```

**Defining a channel:**
```ruby
# app/channels/chat_channel.rb
class ChatChannel < ApplicationCable::Channel
  def subscribed
    room = Room.find(params[:room_id])
    stream_for room  # creates stream "chat:Room#42"
    # or stream_from "chat_room_#{params[:room_id]}" for manual naming
  end

  def unsubscribed
    # Cleanup when client disconnects
  end

  def speak(data)
    Message.create!(
      room_id: params[:room_id],
      user: current_user,
      body: data["message"]
    )
  end
end
```

**Broadcasting from server-side code:**
```ruby
# From anywhere in your app (model, job, controller, service)
ChatChannel.broadcast_to(room, {
  message: message.body,
  user: message.user.name,
  timestamp: message.created_at.iso8601
})

# Or with a manual stream name
ActionCable.server.broadcast("chat_room_42", {
  message: "Hello!",
  user: "Alice"
})

# Common pattern: broadcast from a model callback or job
class Message < ApplicationRecord
  after_create_commit :broadcast_message

  private

  def broadcast_message
    ChatChannel.broadcast_to(room, {
      message: body,
      user: user.name,
      html: ApplicationController.render(partial: "messages/message", locals: { message: self })
    })
  end
end
```

**Rule of thumb:** Authenticate connections in `ApplicationCable::Connection`, not in individual channels. Use `stream_for` with model objects for auto-named streams. Broadcast from models or background jobs, not controllers, to keep things decoupled.
