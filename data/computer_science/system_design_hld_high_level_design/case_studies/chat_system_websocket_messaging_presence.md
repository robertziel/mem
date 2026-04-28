### System Design: Chat System (WebSocket, Messaging, Presence)

**Scope:** 1:1 + group chat, online/offline, read receipts, typing, multi-device, < 200 ms delivery.

**Architecture:**

```
Client A ─► WebSocket ─► Chat Server ─► Message Queue ─► Chat Server ─► WebSocket ─► Client B
                            ↓                                ↓
                     Message Store (Cassandra)       Presence (Redis)
                            ↑
                    Push notif (offline path)
```

**Real-time transport — pick by need:**

| Transport | Direction | Connection | Use |
|---|---|---|---|
| **WebSocket** | Bidirectional | Persistent | **Default for chat** |
| **SSE** (Server-Sent Events) | Server → client only | Persistent HTTP | Notifications, live feeds, simple read-only streams |
| **Long polling** | Both (with reconnect) | One request at a time | Fallback when WS blocked |
| **WebTransport (HTTP/3)** | Bidirectional | Persistent UDP | Emerging — better than WS over lossy networks |
| **HTTP/2 server push** (deprecated) | Server → client | — | Not for chat |

**Components:**

| Component | Job |
|---|---|
| **Gateway / Connection Service** | Terminates WebSocket; auth on connect; maps `user_id → ws-server-id` |
| **Chat Server** | Validates messages, persists, routes to recipients |
| **Message Queue** | Cross-server delivery (Kafka / NATS / Redis Streams) |
| **Message Store** | Durable history (Cassandra / DynamoDB / wide-column) |
| **Presence Service** | "Who's online?" — Redis with TTL |
| **Push Service** | APNs / FCM for offline delivery |
| **Media Service** | S3 + CDN — files / images go here, not through chat |

**Connection routing — the central problem at scale:**

```
1. Client connects → Gateway (LB)
2. Gateway picks ws-server (consistent hash on user_id)
3. Server records user_id → server_id in Redis (TTL = heartbeat × 3)
4. To deliver to user U: look up U's server, push via internal queue
```

| Approach | Tradeoff |
|---|---|
| Sticky session by `user_id` (consistent hash) | Same user always lands on same server |
| Per-user routing table (Redis) | Add servers without disrupting all sessions |
| Per-server pub/sub topic | Server subscribes to its own topic; queue routes to it |
| Multi-device | One row per `(user_id, device_id)`; fan-out to all of user's devices |

**Message delivery flow:**

| Step | What happens |
|---|---|
| 1 | Sender's client emits message over WebSocket |
| 2 | Chat server validates (size, content policy), assigns `message_id` (TimeUUID) |
| 3 | Persist to message store — durable before ACK to sender |
| 4 | Look up recipient's WS server from Redis |
| 5a | **Online** — push via internal queue → recipient's server → WebSocket |
| 5b | **Offline** — store for backfill on next connect; trigger push notification |
| 6 | Sender gets ACK (sent → delivered → read state machine) |
| 7 | Recipient ACKs delivery / read; ack message flows back to sender |

**Message persistence schema:**

| Column | Role |
|---|---|
| `conversation_id` (UUID) | **Partition key** — co-locate one chat's messages |
| `message_id` (TimeUUID) | **Sort key** — time-ordered per partition |
| `sender_id` | Who sent it |
| `content` | Text or media URL |
| `type` | `text` / `image` / `file` / `system` |
| `created_at` | Authoritative server time |

> Wide-column DBs (Cassandra, ScyllaDB) excel here: heavy writes, append-only per partition, time-range queries.

**Group chat — fan-out strategy:**

| Strategy | Use when | Win |
|---|---|---|
| **Fan-out on write** | Groups < ~100 members | One DB write per recipient; cheap reads |
| **Fan-out on read** | Groups > ~100 members | One write to the group's stream; readers pull |
| **Hybrid** | Realistic apps | Active members get pushed, inactive read on connect |

> See [news_feed_timeline_fan_out_push_pull_ranking.md](news_feed_timeline_fan_out_push_pull_ranking.md) for the same tradeoff applied to social feeds.

**Multi-device — every user is many endpoints:**

| Concern | Handling |
|---|---|
| Same message on all devices | Fan-out per `(user, device)` not just per user |
| Device-specific read receipts | `last_read_message_id` per device, max-of for "user has read" |
| New device on connect | Backfill since `last_seen_message_id` |
| Logout on one device | Don't kill other devices' sessions |
| Encrypted DMs (E2EE) | Per-device key; sender encrypts N copies |

**Presence — heartbeat + TTL:**

| Mechanism | Detail |
|---|---|
| Client → server ping | Every 30 s |
| Server → Redis | `SETEX presence:user:U 90 "online"` (TTL = 3 × ping) |
| Offline detection | TTL expires → key gone → user offline |
| Status broadcast | On change, fan-out to friends / group members; **throttle** flapping |
| Last-seen | On disconnect, set `last_seen_at = now()` for "active 5 min ago" UI |
| Presence privacy | Per-user setting: visible to everyone / friends / nobody |

**Read receipts & typing — pick the right durability:**

| Signal | Persisted? | How |
|---|---|---|
| Typing indicator | **No** — pure ephemeral | Send over WS, expire after 5 s of no event |
| Read receipt | Yes — but compact | One row per `(conversation, user)` with `last_read_message_id` |
| Delivered ACK | Optional | Either ephemeral or stored as a tiny per-message bool |
| Reactions | Yes | Separate row per `(message_id, user_id, emoji)` |

**Push notifications (offline path):**

| Step | Action |
|---|---|
| 1 | User offline (no presence key, no WS) |
| 2 | Chat server enqueues to push pipeline |
| 3 | Push service formats per platform (APNs / FCM) |
| 4 | User opens app → reconnect → backfill missed messages by `> last_message_id` |
| 5 | If push lands but app not opened, badge count + lock-screen preview |

**Scaling each piece:**

| Pressure | Lever |
|---|---|
| WS connection count (millions) | Many WS servers; consistent-hash routing; tune kernel `fs.file-max`, `nofile` |
| Read latency on history | Recent messages in Redis cache; older from Cassandra |
| Group fan-out spikes | Async via partitioned queue (key by group_id); rate-limit broadcasts |
| Presence churn | Pubsub + throttle; don't broadcast every 30-s heartbeat |
| Hot conversation | Per-conversation rate limit; coarsen typing-indicator events |
| Media upload | Direct upload to S3 (signed URL); store URL in message |

**Failure modes:**

| Failure | Recovery |
|---|---|
| WS server crash | Clients reconnect → routed to new server → backfill since last seen |
| Message persisted but ACK lost | Idempotent send: `client_msg_id` dedup |
| Network blip mid-typing | Client buffers, replays on reconnect |
| Push delivery fails | Retry with backoff; cap attempts; in-app delivery on next open |
| Cassandra timeout on write | Retry only if **idempotent**; surface error to sender otherwise |

**Common interview tradeoffs:**

| Question | Tradeoff |
|---|---|
| Push receipts to sender as separate event vs piggyback | Separate is simpler; piggyback saves bandwidth |
| Encrypt at rest vs E2EE | E2EE prevents server-side search and moderation |
| Single global cluster vs per-region | Region affinity → lower latency but cross-region groups are harder |
| Order guarantees | Per-conversation ordering is enough; global ordering is expensive and rarely needed |
| Storage retention | Forever (trust + compliance) vs N days (cost + privacy) |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Stateless WS server with no routing table | Can't deliver — server has connection but no one knows |
| Persisting typing/presence | Storage explosion for ephemeral state |
| Synchronous write-then-fanout in request path | Latency tied to recipient count |
| No `client_msg_id` dedup | Network retries create duplicates |
| Assuming a user has one device | Drops messages on alternate devices |
| Storing media in the message store | Bloats hot data; use S3 + URL reference |
| Polling instead of WS for presence | Linear cost in friend count × users |

**Rule of thumb:** **WebSocket as default; partition messages by `conversation_id`** so all of one chat's history lives together. **Fan-out on write for small groups, on read for large.** **Presence = heartbeat + Redis TTL**, broadcast changes (not heartbeats). **Push notifications are the offline path** — don't try to keep WS connected on a backgrounded mobile app. **Media via S3 + CDN, never through chat servers.** Keep typing/read-receipts ephemeral over WS; persist only what users actually need to scroll back.
