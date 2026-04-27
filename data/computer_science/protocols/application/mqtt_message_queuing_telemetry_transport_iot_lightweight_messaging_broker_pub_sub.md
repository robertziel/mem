### MQTT (Message Queuing Telemetry Transport)

**What MQTT is:**
- Lightweight pub/sub messaging protocol for IoT and constrained devices
- Minimal overhead: 2-byte header (vs HTTP's ~700 bytes)
- Port 1883 (plaintext), Port 8883 (over TLS)
- Designed for: low bandwidth, unreliable networks, battery-powered devices

**How MQTT works:**
```
[Device A] --publish("sensor/temp", "22.5")--> [MQTT Broker]
                                                     |
[Device B] --subscribe("sensor/temp")---------→ receives "22.5"
[Dashboard] --subscribe("sensor/#")------------→ receives all sensor data
```

**Key concepts:**
- **Broker**: central server that receives and routes messages (Mosquitto, EMQX, AWS IoT Core)
- **Topic**: hierarchical string for routing (`home/bedroom/temperature`)
- **Publish**: send message to a topic
- **Subscribe**: listen to a topic (supports wildcards)
- **QoS (Quality of Service)**: delivery guarantee level

**QoS levels:**
| QoS | Name | Guarantee | Use when |
|-----|------|-----------|----------|
| 0 | At most once | Fire and forget (may lose) | Sensor telemetry (frequent, loss OK) |
| 1 | At least once | Delivered, may duplicate | Commands, alerts |
| 2 | Exactly once | Delivered once (most overhead) | Financial transactions, critical |

**Topic wildcards:**
```
+   = single level wildcard
#   = multi level wildcard

sensor/+/temperature     → matches sensor/bedroom/temperature, sensor/kitchen/temperature
sensor/#                 → matches sensor/bedroom/temperature, sensor/kitchen/humidity, etc.
home/+/light/+/status    → matches home/bedroom/light/1/status
```

**Retained messages and Last Will:**
- **Retained**: broker stores last message per topic, sends to new subscribers immediately
- **Last Will (LWT)**: message published by broker when client disconnects unexpectedly
```
Client connects with LWT: topic="device/123/status", payload="offline"
Client disconnects unexpectedly → broker publishes "offline" to device/123/status
```

**MQTT vs HTTP vs WebSocket for IoT:**
| Feature | MQTT | HTTP | WebSocket |
|---------|------|------|-----------|
| Overhead | Minimal (2 bytes) | High (~700 bytes) | Medium |
| Direction | Bidirectional | Request-response | Bidirectional |
| Connection | Persistent | Per-request | Persistent |
| Battery | Low drain | High drain | Medium |
| Best for | IoT sensors, constrained devices | Web APIs | Real-time web apps |

**AWS IoT Core (managed MQTT):**
- Managed MQTT broker at scale
- Device authentication via X.509 certificates
- Rules engine: route messages to Lambda, DynamoDB, S3, Kinesis
- Device shadow: store latest device state for offline devices

**Rule of thumb:** MQTT for IoT and constrained devices (low bandwidth, battery-powered). QoS 0 for frequent telemetry, QoS 1 for commands. Use retained messages for device status. AWS IoT Core for managed MQTT at scale. Not for general web apps (use WebSocket or SSE instead).
