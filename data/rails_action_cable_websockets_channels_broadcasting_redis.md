### Action Cable: WebSockets in Rails

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

**Client-side JavaScript (with Turbo or importmaps):**
```javascript
// app/javascript/channels/chat_channel.js
import consumer from "./consumer"

consumer.subscriptions.create(
  { channel: "ChatChannel", room_id: roomId },
  {
    connected() {
      console.log("Connected to chat")
    },

    disconnected() {
      console.log("Disconnected from chat")
    },

    received(data) {
      // Append new message to the DOM
      const messages = document.getElementById("messages")
      messages.insertAdjacentHTML("beforeend",
        `<div class="message"><strong>${data.user}</strong>: ${data.message}</div>`
      )
    },

    // Call server-side action
    speak(message) {
      this.perform("speak", { message: message })
    }
  }
)
```

**Redis adapter (required for multi-process/multi-server):**
```yaml
# config/cable.yml
development:
  adapter: async   # in-memory, single process only

test:
  adapter: test

production:
  adapter: redis
  url: <%= ENV.fetch("REDIS_URL", "redis://localhost:6379/1") %>
  channel_prefix: myapp_production
```

**Turbo Streams with Action Cable (modern approach):**
```ruby
# Broadcasting via Turbo Streams (no custom JavaScript needed)
class Message < ApplicationRecord
  broadcasts_to :room  # auto-broadcasts create/update/destroy
end

# In the view
<%= turbo_stream_from @room %>
<div id="messages">
  <%= render @room.messages %>
</div>
```

**Action Cable vs SSE (Server-Sent Events):**
| Feature | Action Cable (WebSocket) | SSE (Server-Sent Events) |
|---------|--------------------------|--------------------------|
| Direction | Bidirectional | Server to client only |
| Protocol | WebSocket (ws://) | HTTP (text/event-stream) |
| Reconnection | Manual handling | Built-in auto-reconnect |
| Browser support | All modern browsers | All modern (no IE) |
| Complexity | Higher (channels, Redis) | Lower (simple HTTP) |
| Use case | Chat, collaborative editing | Notifications, live feeds |
| Infrastructure | Needs Redis for scaling | Works with any HTTP server |
| Connection limits | Per-server, tunable | Subject to HTTP/1.1 limits |

**Testing Action Cable:**
```ruby
# spec/channels/chat_channel_spec.rb
RSpec.describe ChatChannel, type: :channel do
  let(:user) { create(:user) }
  let(:room) { create(:room) }

  before { stub_connection current_user: user }

  it "subscribes to the room stream" do
    subscribe(room_id: room.id)
    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_for(room)
  end

  it "broadcasts a message on speak" do
    subscribe(room_id: room.id)
    expect { perform(:speak, message: "Hello") }
      .to change(Message, :count).by(1)
  end
end

# Test broadcasting
RSpec.describe Message do
  it "broadcasts after creation" do
    room = create(:room)
    expect {
      create(:message, room: room, body: "Hi")
    }.to have_broadcasted_to(room).from_channel(ChatChannel)
  end
end
```

**Production considerations:**
```ruby
# config/environments/production.rb
config.action_cable.allowed_request_origins = [
  "https://example.com",
  "https://www.example.com"
]
config.action_cable.url = "wss://cable.example.com/cable"
# Or mount at a path on the same domain:
# config.action_cable.mount_path = "/cable"

# Nginx config for WebSocket proxying
# location /cable {
#   proxy_pass http://puma;
#   proxy_http_version 1.1;
#   proxy_set_header Upgrade $http_upgrade;
#   proxy_set_header Connection "upgrade";
# }
```

**Rule of thumb:** Use Action Cable when you need bidirectional real-time communication (chat, collaborative editing). Use Turbo Streams over Action Cable for simpler live updates (notifications, feeds). Use SSE for one-way server pushes where simplicity matters. Always use the Redis adapter in production for multi-process support. Authenticate connections in `ApplicationCable::Connection`, not in individual channels.
