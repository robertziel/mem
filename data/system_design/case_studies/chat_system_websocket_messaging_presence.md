### System Design: Chat System

**Requirements:**
- 1:1 messaging and group chat
- Online/offline status
- Read receipts, typing indicators
- Message history and persistence
- Multi-device support
- Low latency (<200ms message delivery)

**Protocol choice:**
| Protocol | Use case | Tradeoffs |
|----------|----------|-----------|
| WebSocket | Real-time bidirectional | Persistent connection, stateful |
| SSE | Server-to-client only | Simpler, HTTP-based |
| Long polling | Fallback | Higher latency, more overhead |

WebSocket is the standard choice for chat.

**High-level design:**
```
Client A -> WebSocket -> Chat Server -> Message Queue -> Chat Server -> WebSocket -> Client B
                              |                              |
                              v                              v
                        Message Store (Cassandra)    Presence Service (Redis)
```

**Key components:**

**1. Connection Service:**
- Manages WebSocket connections
- Maps user_id -> server_id (which server holds the connection)
- User connects -> register in Redis: `user:123 -> server:ws-5`
- Horizontal scaling: many WebSocket servers behind LB (sticky by user)

**2. Message flow:**
```
1. Client A sends message via WebSocket
2. Chat server validates, persists to message store
3. Look up recipient's connection server
4. If online: route via message queue -> recipient's chat server -> WebSocket -> Client B
5. If offline: store for later delivery, send push notification
```

**3. Message storage:**
- Messages are write-heavy, append-only, queried by conversation + time
- Cassandra or DynamoDB: partition by `conversation_id`, sort by `timestamp`
- Recent messages in cache (Redis) for fast loading

```
messages:
  conversation_id  UUID      # partition key
  message_id       TIMEUUID  # sort key (time-ordered)
  sender_id        BIGINT
  content          TEXT
  type             ENUM (text, image, file)
  created_at       TIMESTAMP
```

**4. Group chat:**
- Group has member list
- Fan-out on write: send message to each member's queue
- Fan-out on read: store once, each member reads (better for large groups)
- Small groups (<100): fan-out on write. Large groups (>100): fan-out on read

**5. Presence (online/offline):**
- Heartbeat: client sends ping every 30s
- No heartbeat for 90s -> mark offline
- Store in Redis with TTL: `SETEX presence:user:123 90 "online"`
- Broadcast status changes to friends/group members (throttle updates)

**6. Read receipts / typing indicators:**
- Ephemeral: don't persist, send via WebSocket only
- Typing: client sends event, server relays to conversation members
- Read receipts: update `last_read_message_id` per user per conversation

**Scaling:**
- WebSocket servers: stateful, use consistent hashing for user routing
- Message store: partition by conversation_id (Cassandra scales horizontally)
- Presence: Redis cluster with TTL-based expiry
- Media (images, files): upload to S3, store URL in message

**Rule of thumb:** WebSocket for real-time. Partition messages by conversation for locality. Fan-out on write for small groups, on read for large. Presence via heartbeat + Redis TTL. Media via S3, not through the chat server.
