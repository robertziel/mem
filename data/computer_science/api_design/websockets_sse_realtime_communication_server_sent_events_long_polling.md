### WebSockets, SSE, Long Polling — Real-Time Communication

**Definition:** three patterns for **real-time client-server communication**. **WebSocket** = persistent bidirectional binary; **SSE** = persistent server-to-client text-only with auto-reconnect; **long polling** = repeated HTTP requests. Pick by direction (uni vs bidi), payload type, and complexity tolerance.

**Side-by-side:**

| Property | **WebSocket** | **SSE** | **Long Polling** |
|---|---|---|---|
| Direction | **Bidirectional** | Server → Client only | Simulated bidi (req/resp) |
| Protocol | `ws://` / `wss://` | HTTP | HTTP |
| Connection | Persistent (single) | Persistent (single) | Repeated requests |
| Reconnection | **Manual** | **Automatic** (built-in with `Last-Event-ID`) | Manual loop |
| Binary data | ✅ | ❌ (text only) | Either |
| Browser support | Universal | Universal (no IE) | Universal |
| Complexity | Higher (server state) | **Lower** | Lowest (just HTTP) |
| Proxy / firewall | Sometimes blocked | HTTP — works through | HTTP — works through |
| Best for | Chat, gaming, collaboration | Notifications, dashboards, feeds | Fallback, simple updates |

**Decision tree:**

```
Need bidirectional?
   YES → WebSocket
   NO  → Need server-pushed notifications?
            YES → SSE
            NO  → Long polling (or just regular HTTP)

Need binary data?
   YES → WebSocket (SSE is text-only)
```

**WebSocket — bidirectional persistent:**

```javascript
// Client
const ws = new WebSocket('wss://api.example.com/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'orders' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onclose = () => console.log('disconnected');
ws.onerror = (e) => console.error('error', e);

// Send
ws.send(JSON.stringify({ type: 'ping' }));

// Close
ws.close();
```

**Server side (Python with `websockets`):**

```python
async def handler(websocket):
    async for message in websocket:
        data = json.loads(message)
        if data['type'] == 'subscribe':
            await subscribe(websocket, data['channel'])
        elif data['type'] == 'ping':
            await websocket.send(json.dumps({ 'type': 'pong' }))
```

**WebSocket lifecycle:**

| Event | Detail |
|---|---|
| **HTTP Upgrade** | Initial GET with `Upgrade: websocket` |
| **101 Switching Protocols** | Server agrees |
| **Frames** | Bidirectional message-based |
| **Ping / Pong** | Keepalive |
| **Close** | Either side can close (with code + reason) |

**WebSocket considerations:**

| Concern | Detail |
|---|---|
| **Stateful** | Server tracks each connection |
| **Load balancing** | Need sticky sessions OR external pub/sub |
| **Scaling** | Each connection consumes server resources (RAM, FDs) |
| **Auth** | Token in query param OR first message; validate during upgrade |
| **Heartbeat** | Ping/pong to detect dead connections (every 30s typical) |
| **Reconnection** | Manual; exponential backoff on close |
| **Compression** | `permessage-deflate` extension |
| **Message ordering** | Within one connection, FIFO |

**SSE — server-sent events (server → client only):**

```javascript
// Client
const source = new EventSource('/api/events');

source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

source.addEventListener('order_update', (event) => {
  // Named event type
  console.log('Order update:', JSON.parse(event.data));
});

source.onerror = () => console.log('reconnecting...');

source.close();   // To stop
```

**SSE server (Python Flask):**

```python
from flask import Response

@app.route('/api/events')
def events():
    def generate():
        last_id = request.headers.get('Last-Event-ID', '0')
        while True:
            event = get_next_event(after_id=last_id)
            if event:
                last_id = event.id
                yield (
                    f"id: {event.id}\n"
                    f"event: {event.type}\n"
                    f"data: {json.dumps(event.data)}\n\n"
                )
            else:
                time.sleep(0.1)
    return Response(generate(), mimetype='text/event-stream')
```

**SSE protocol:**

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

id: 1
event: order_update
data: {"order_id": 42, "status": "shipped"}

id: 2
data: {"message": "another update"}

```

| Field | Detail |
|---|---|
| `id:` | Event ID (browser sends back as `Last-Event-ID` on reconnect) |
| `event:` | Named event type (default: `message`) |
| `data:` | Payload (can span multiple lines) |
| `retry:` | Reconnection delay in ms |
| Comment (`:`) | Keepalive |
| Blank line | End of event |

**SSE advantages over WebSocket:**

| Advantage | Detail |
|---|---|
| **Simpler** | Just HTTP |
| **Auto-reconnect** | Browser handles it (with `Last-Event-ID`) |
| **Works through proxies / firewalls** | Standard HTTP |
| **No special server infra** | Plain HTTP server |
| **HTTP/2 multiplexing** | Many SSE streams over one connection |
| **Good enough for**: notifications, dashboards, live feeds, progress | Most apps don't need bidi |

**SSE limitations:**

| Limitation | Detail |
|---|---|
| Server → client only | No client → server (use POST) |
| Text only | UTF-8 |
| 6-connection-per-domain limit (HTTP/1.1) | Mitigated by HTTP/2 |
| No native message framing | Self-document with event types |

**Long polling — fallback:**

```javascript
async function poll() {
  while (true) {
    try {
      const response = await fetch('/api/poll', { signal: AbortSignal.timeout(30000) });
      if (response.ok) {
        const events = await response.json();
        events.forEach(handleEvent);
      }
    } catch (e) {
      console.log('polling error, retry...');
    }
  }
}
```

**Long polling server:**

```python
@app.route('/api/poll')
def poll():
    last_id = request.args.get('since', 0)
    timeout = time.time() + 30  # hold up to 30 seconds
    while time.time() < timeout:
        events = get_events_since(last_id)
        if events:
            return jsonify(events)
        time.sleep(0.5)
    return jsonify([])  # timeout, empty response
```

| Property | Detail |
|---|---|
| Hold request open | Until event or timeout |
| Reconnect on response | New request |
| Higher overhead | Headers + new connection per poll |
| **Last resort** | When WebSocket / SSE blocked |
| Common in legacy clients | Browser fallback |

**Use case mapping:**

| Use case | Best |
|---|---|
| Chat | WebSocket |
| Multiplayer game | WebSocket |
| Collaborative editing | WebSocket |
| Live notifications | SSE |
| Dashboard live updates | SSE |
| Stock ticker | SSE or WebSocket |
| IoT device control (bidi) | WebSocket |
| File upload progress | SSE |
| Server logs streaming | SSE |
| Form input collaboration | WebSocket |
| Simple "new data?" check | Long polling (or SSE) |

**Scaling real-time connections:**

```
Client ──► Load Balancer (sticky) ──► WebSocket Server
                                            │
                                            ▼
                                       Redis Pub/Sub  ◄── Other WS servers publish
                                            │
                                            ▼
                                       Broadcast to all subscribed connections
```

| Component | Detail |
|---|---|
| **Sticky LB** | Same client → same server |
| **Redis Pub/Sub** | Cross-server broadcast |
| **Connection limits** | Per server: tens of thousands |
| **State** | Connection metadata in Redis / DB |
| **Auth** | Token validated at upgrade |
| **Per-server RAM** | ~10–50 KB per connection |

**Managed services:**

| Service | Detail |
|---|---|
| **AWS API Gateway WebSocket** | Managed routes, $1.25 per million conn-min |
| **AWS AppSync** | GraphQL + subscriptions |
| **Pusher** | Hosted WebSocket / Pub/Sub |
| **Ably** | Realtime infra |
| **Firebase Realtime DB** | DB with realtime subscriptions |
| **Supabase Realtime** | Postgres-backed pub/sub |

**Authentication patterns:**

| Pattern | Detail |
|---|---|
| Token in query param | `wss://?token=xyz` (visible in URL — careful) |
| `Sec-WebSocket-Protocol` subprotocol | `wss://` with auth subprotocol |
| First message after connect | `{ "type": "auth", "token": "xyz" }` |
| Cookie + same-origin | Browsers send cookies on upgrade |
| TLS (`wss://`) always | Encrypt the channel |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| WebSocket without heartbeat | Dead connections accumulate |
| No reconnection logic | User goes offline, never recovers |
| Sticky session breaks horizontal scale | Sessions glue up |
| All clients on one server | One restart kicks all users |
| No rate limit on inbound messages | DoS vector |
| Cleartext (`ws://`) in prod | Sniffable |
| SSE without HTTP/2 | 6-connection browser limit |
| Long polling with too-short timeout | Reconnect storm |
| Missing `Last-Event-ID` handling on SSE | Lost events on reconnect |
| Storing connection state only in memory | Lost on pod restart |

**Decision matrix:**

| Need | Pick |
|---|---|
| Bidi + real-time + binary | **WebSocket** |
| Server-push only, simple | **SSE** |
| Through hostile proxies / firewalls | SSE / Long polling |
| Highly interactive (game, chat) | WebSocket |
| Live dashboard / metrics | SSE |
| Notifications | SSE |
| Last-resort fallback | Long polling |
| Don't want to build it | Pusher / Ably / API Gateway WS |

**Cross-references:**

- HTTP methods + idempotency: [http_methods_*.md](../frontend/web_fundamentals/http_methods_idempotency_get_post_put_delete_idempotent.md)
- Event-driven patterns: [message_queues_*.md](../system_design_hld_high_level_design/fundamentals/message_queues_event_driven_kafka_sqs_pub_sub.md)
- Redis pub/sub + streams: [redis_data_structures_*.md](../database_engineering/redis_data_structures_patterns_sorted_set_caching_leaderboard_pub_sub.md)
- Hotwire (Rails real-time UI): [hotwire_*.md](../ruby/rails/features/hotwire_turbo_frames_streams_stimulus.md)

**Rule of thumb:** **SSE for server-to-client only** (simpler, auto-reconnect, works through proxies). **WebSocket** when you need **bidirectional or binary**. **Long polling** as last resort. Always implement **heartbeat** for WebSocket (detect dead connections), **TLS** in production, and use **Redis Pub/Sub or Kafka** for broadcasting across multiple server instances.
