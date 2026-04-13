### WebSockets, SSE, and Real-Time Communication

**Comparison:**
| Feature | WebSocket | SSE (Server-Sent Events) | Long Polling |
|---------|-----------|--------------------------|-------------|
| Direction | Bidirectional | Server -> Client only | Simulated bidirectional |
| Protocol | ws:// / wss:// | HTTP | HTTP |
| Connection | Persistent | Persistent | Repeated requests |
| Reconnection | Manual | Automatic (built-in) | Manual |
| Binary data | Yes | No (text only) | Yes |
| Browser support | Universal | Universal (except old IE) | Universal |
| Complexity | Higher | Lower | Lowest |
| Best for | Chat, gaming, collaboration | Notifications, feeds, dashboards | Fallback, simple updates |

**WebSocket:**
```javascript
// Client
const ws = new WebSocket('wss://api.example.com/ws');
ws.onopen = () => ws.send(JSON.stringify({type: 'subscribe', channel: 'orders'}));
ws.onmessage = (event) => console.log(JSON.parse(event.data));
ws.onclose = () => console.log('disconnected');
```

```python
# Server (simplified)
async def websocket_handler(websocket):
    async for message in websocket:
        data = json.loads(message)
        if data['type'] == 'subscribe':
            await subscribe(websocket, data['channel'])
```

**WebSocket considerations:**
- Stateful (server must track connections)
- Load balancing: need sticky sessions or external pub/sub (Redis)
- Scaling: each connection consumes server resources
- Auth: authenticate during handshake (token in query param or first message)
- Heartbeat: ping/pong to detect dead connections

**SSE (Server-Sent Events):**
```javascript
// Client
const source = new EventSource('/api/events');
source.onmessage = (event) => console.log(JSON.parse(event.data));
source.onerror = () => console.log('reconnecting...');  // auto-reconnects
```

```python
# Server (Flask example)
@app.route('/api/events')
def events():
    def generate():
        while True:
            data = get_next_event()
            yield f"data: {json.dumps(data)}\n\n"
    return Response(generate(), mimetype='text/event-stream')
```

**SSE advantages over WebSocket:**
- Simpler: just HTTP, works through proxies and firewalls
- Auto-reconnect with `Last-Event-ID` header
- No special server infrastructure needed
- Good enough for: notifications, live feeds, dashboards, progress updates

**When to use what:**
| Use case | Best choice |
|----------|------------|
| Chat, multiplayer game | WebSocket |
| Collaborative editing | WebSocket |
| Live notifications | SSE |
| Dashboard live updates | SSE |
| Stock ticker | SSE or WebSocket |
| IoT device control | WebSocket |
| File upload progress | SSE |
| Simple fallback | Long Polling |

**Scaling real-time connections:**
- Use Redis Pub/Sub or Kafka to broadcast across server instances
- WebSocket servers don't scale like stateless HTTP servers
- Consider managed services: AWS API Gateway WebSocket, Pusher, Ably

```
Client -> LB (sticky) -> WS Server -> Redis Pub/Sub -> All WS Servers -> All Clients
```

**Rule of thumb:** SSE for server-to-client only (simpler, auto-reconnect). WebSocket when you need bidirectional or binary data. Long polling as last resort. Always implement heartbeat for WebSocket. Use Redis Pub/Sub for multi-server broadcasting.
