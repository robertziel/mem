### MQTT — Message Queuing Telemetry Transport (IoT Pub/Sub)

**Definition:** **MQTT** is a **lightweight publish-subscribe protocol** designed for IoT and constrained devices: minimal header (~2 bytes vs HTTP's ~700), persistent connection, **QoS levels** for delivery guarantees. Used wherever battery-powered devices on flaky networks need efficient bidirectional messaging.

**Protocol essentials:**

| Property | Detail |
|---|---|
| Layer | Application (over TCP) |
| Port | **1883** plaintext, **8883** TLS |
| Header overhead | ~2 bytes minimum |
| Connection model | Persistent (long-lived) |
| Direction | Bidirectional |
| Pattern | Publish-subscribe via broker |
| Use case | IoT, sensor telemetry, device commands |

**Architecture:**

```
   ┌──────────┐                ┌─────────────┐
   │  Device A │ ── publish ──►│             │
   │  (sensor)│   "sensor/temp"│             │
   └──────────┘   "22.5"       │ MQTT Broker │
                                │             │
   ┌──────────┐                │             │── ► [Device B]
   │ Dashboard│ ── subscribe ──│             │      receives
   │          │   "sensor/#"   │             │      "22.5"
   └──────────┘                └─────────────┘
```

**Core concepts:**

| Concept | Detail |
|---|---|
| **Broker** | Central server (Mosquitto, EMQX, HiveMQ, AWS IoT Core) |
| **Topic** | Hierarchical string (`home/bedroom/temperature`) |
| **Publish** | Send message to topic |
| **Subscribe** | Listen to topic (with wildcards) |
| **QoS** | Delivery guarantee (0, 1, or 2) |
| **Retained message** | Last value stored per topic |
| **Last Will (LWT)** | Message on unexpected disconnect |
| **Clean session** | Whether broker remembers state for client |

**QoS levels — delivery guarantees:**

| QoS | Name | Guarantee | Use when |
|---|---|---|---|
| **0** | At most once | Fire-and-forget; may lose | Frequent sensor telemetry (loss OK) |
| **1** | At least once | Delivered; **may duplicate** | Commands, alerts (idempotent) |
| **2** | Exactly once | Delivered exactly once | Critical (most overhead — 4-step handshake) |

**Topic structure:**

```
home/bedroom/temperature
home/bedroom/humidity
home/kitchen/temperature
home/kitchen/light/status
home/kitchen/light/state

Wildcards in subscriptions:
+ = single level
# = multi level (only at end)
```

| Subscription | Matches |
|---|---|
| `home/+/temperature` | `home/bedroom/temperature`, `home/kitchen/temperature` |
| `home/#` | `home/bedroom/temperature`, `home/kitchen/light/status`, all under `home/` |
| `home/kitchen/light/+/status` | `home/kitchen/light/1/status`, `home/kitchen/light/2/status` |

**Retained messages:**

| Property | Detail |
|---|---|
| Broker stores last message per topic | Until replaced or cleared |
| New subscribers get it immediately | "Welcome" state |
| Use case | Device status, last reading |
| Clear: publish empty payload with retain flag | Delete |
| Per-topic | Separate retained messages per topic |

**Last Will (LWT):**

```
Client connects with LWT specification:
   topic   = "device/123/status"
   payload = "offline"
   retain  = true
   QoS     = 1

Client disconnects unexpectedly (timeout, network drop, crash)
   → Broker publishes "offline" to "device/123/status"
   → All subscribers know the device is gone
```

| Use case | Detail |
|---|---|
| Detect device failure | Without polling |
| Status display | Online / offline |
| Triggers | Alert workflows |

**Sessions — persistent vs clean:**

| Setting | Detail |
|---|---|
| **Clean session = false** (persistent) | Broker remembers subscriptions + queued QoS 1/2 messages between connections |
| **Clean session = true** | Fresh state on each connect |
| Persistent ID required for persistent session | Client identifier |
| Use persistent for | Devices that disconnect periodically |

**Comparison: MQTT vs HTTP vs WebSocket:**

| Property | **MQTT** | **HTTP** | **WebSocket** |
|---|---|---|---|
| Header overhead | 2 bytes | ~700 bytes | Medium |
| Direction | Bidirectional | Request-response | Bidirectional |
| Connection | Persistent | Per-request | Persistent |
| Battery drain | Low | High | Medium |
| Pub/Sub | Native | Manual (long-poll, SSE) | Manual |
| Broker | Required | None | None |
| QoS | Native (3 levels) | Single | Single |
| Best for | IoT, constrained | REST APIs | Real-time web apps |

**MQTT broker comparison:**

| Broker | Detail |
|---|---|
| **Mosquitto** | Lightweight, OSS, single-process |
| **EMQX** | Scalable, clusterable, enterprise features |
| **HiveMQ** | Enterprise, MQTT 5 advanced |
| **VerneMQ** | Distributed, OSS |
| **AWS IoT Core** | Managed, deeply integrated with AWS |
| **Azure IoT Hub** | Managed Microsoft equivalent |

**MQTT 3.1.1 vs MQTT 5:**

| Feature | 3.1.1 | 5 |
|---|---|---|
| Properties (metadata) | None | Rich (response topic, content type) |
| Reason codes | Limited | Granular |
| Shared subscriptions | No | Yes (load balance subscribers) |
| User properties | No | Yes (custom KV) |
| Session expiry | Connect-time only | Tunable per session |
| Topic alias | No | Yes (compress topics) |
| Industry adoption | Most common | Growing |

**AWS IoT Core specifics:**

| Feature | Detail |
|---|---|
| Managed MQTT broker at scale | Up to 1M+ devices per account |
| **Device authentication** | X.509 certs (mTLS) or Cognito |
| **Rules engine** | Route messages to Lambda, DynamoDB, S3, Kinesis |
| **Device shadow** | Last-known state for offline devices |
| **Jobs** | Remote updates, OTA |
| **Fleet provisioning** | Scale device onboarding |
| Pricing | Per million messages + per connection minute |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Sensor telemetry** | Many devices → broker → analytics pipeline |
| **Device commands** | App → broker → specific device |
| **Status broadcasts** | Device → retained message |
| **Fan-out alerts** | Sensor → broker → many subscribers |
| **Backend command-response** | Custom topic for replies |
| **Geofencing** | Topic per region |

**Security checklist:**

| Item | Detail |
|---|---|
| TLS (port 8883) | Encrypt in transit |
| mTLS (X.509 certs) | Strong device identity |
| Per-device unique credentials | No shared secrets |
| Topic ACLs | Restrict pub/sub permissions |
| Cert rotation | Periodic renewal |
| Disable anonymous access | Always |
| Rate limiting | Stop noisy devices |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| QoS 0 for critical commands | Messages lost |
| QoS 2 for high-throughput sensors | 4× overhead, drowns broker |
| `#` wildcard at start of topic | Pattern not allowed |
| Long topic strings | Bandwidth waste; use MQTT 5 topic aliases |
| Plaintext on port 1883 in prod | Use TLS (8883) |
| Shared device certs | Can't isolate compromised device |
| Persistent session for ephemeral clients | Memory waste at broker |
| Broker without HA | SPOF for whole fleet |
| Retained message without intention | Stale state |
| No Last Will | Devices appear online forever |

**Decision matrix:**

| Need | Pick |
|---|---|
| IoT sensor telemetry | MQTT (QoS 0 or 1) |
| IoT command-response | MQTT (QoS 1) |
| Web app real-time | WebSocket (or SSE) |
| Web request-response | HTTP |
| Cloud-to-device + scale | AWS IoT Core / Azure IoT Hub |
| Self-hosted small | Mosquitto |
| Self-hosted large | EMQX / VerneMQ |

**Cross-references:**

- WebSocket / SSE / long polling: [websocket_*.md](../../system_design_hld_high_level_design/fundamentals/websocket_long_polling_sse_realtime.md)
- Pub/Sub patterns (Redis, etc.): [redis_data_structures_*.md](../../database_engineering/redis_data_structures_patterns_sorted_set_caching_leaderboard_pub_sub.md)
- Kafka comparison: [kafka_*.md](../../data_engineering/kafka_event_streaming_topic_partition_offset.md)
- Idempotency keys (for QoS 1 dedup): [idempotency_*.md](../../distributed_systems/idempotency_key_exactly_once_deduplication.md)

**Rule of thumb:** **MQTT for IoT and constrained devices** — low bandwidth, persistent connection, battery-friendly. Use **QoS 0** for frequent telemetry (loss OK), **QoS 1** for commands (with idempotent handlers), **QoS 2** rarely (4× overhead). Always use **TLS (port 8883)** + **mTLS** in production. **AWS IoT Core / Azure IoT Hub** for managed scale; **Mosquitto / EMQX** for self-hosted. Don't reach for MQTT in regular web apps — use **WebSocket** or **SSE** instead.
