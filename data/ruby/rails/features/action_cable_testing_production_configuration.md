### Action Cable: Testing & Production Configuration

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

**Rule of thumb:** Use `stub_connection` to set up authenticated test connections. Test both subscription confirmation and stream attachment. Use `have_broadcasted_to` matcher to verify broadcasts without hitting Redis. In production, whitelist allowed origins and configure Nginx to proxy WebSocket upgrades.
