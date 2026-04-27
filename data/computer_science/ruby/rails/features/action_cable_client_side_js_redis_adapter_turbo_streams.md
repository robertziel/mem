### Action Cable: Client-Side JS, Redis Adapter & Turbo Streams

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

**Rule of thumb:** Use Turbo Streams over Action Cable for simpler live updates (notifications, feeds) -- no custom JavaScript needed. Use SSE for one-way server pushes where simplicity matters. Always use the Redis adapter in production for multi-process support.
