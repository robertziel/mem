### Kafka Schema Registry, Avro & Schema Evolution

**The schema problem:**
- Producers and consumers must agree on message format
- Schema changes can break consumers if not managed
- Need: versioned schemas, compatibility rules, centralized registry

**Schema Registry:**
```
Producer → serialize with schema → [Kafka] → Consumer → deserialize with schema
                ↑                                              ↑
           Schema Registry (stores/validates schemas)
```
- Centralized schema store (Confluent Schema Registry)
- Schemas versioned per subject (topic-key, topic-value)
- Compatibility checks on registration (prevent breaking changes)
- Schema ID embedded in each Kafka message (4-byte header)

**Serialization formats:**
| Format | Type | Size | Schema | Human-readable | Best for |
|--------|------|------|--------|---------------|----------|
| JSON | Text | Large | Optional (JSON Schema) | Yes | Debugging, simple |
| Avro | Binary | Small | Required (embedded) | No | Kafka standard, schema evolution |
| Protobuf | Binary | Small | Required (.proto) | No | gRPC + Kafka, cross-language |

**Avro schema example:**
```json
{
  "type": "record",
  "name": "Order",
  "namespace": "com.myapp.events",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "user_id", "type": "string"},
    {"name": "total", "type": "double"},
    {"name": "status", "type": {"type": "enum", "name": "Status", "symbols": ["PENDING", "PAID", "SHIPPED"]}},
    {"name": "created_at", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "notes", "type": ["null", "string"], "default": null}
  ]
}
```

**Schema evolution (adding/removing fields):**

**Backward compatible (consumer can read old + new):**
```json
// V1: { "name": "Alice", "email": "a@b.com" }
// V2: { "name": "Alice", "email": "a@b.com", "age": 30 }

// New field MUST have a default value
{"name": "age", "type": "int", "default": 0}
// Old consumers ignore "age" (unknown field), new consumers use it
```

**Forward compatible (old consumer can read new messages):**
```json
// V1: { "name": "Alice", "email": "a@b.com", "phone": "555" }
// V2: { "name": "Alice", "email": "a@b.com" }   (removed "phone")

// Removed field MUST have had a default value in V1
// Old consumers use default when "phone" is missing
```

**Full compatible (both backward + forward):**
- Add fields with defaults
- Remove fields that had defaults
- Safest: both old and new consumers handle any version

**Compatibility modes:**
| Mode | Can add fields | Can remove fields | Safe for |
|------|---------------|------------------|----------|
| BACKWARD | Yes (with default) | Yes | New consumer, old data |
| FORWARD | Yes | Yes (if had default) | Old consumer, new data |
| FULL | Yes (with default) | Yes (if had default) | Both directions |
| NONE | Yes | Yes | No safety (avoid) |

**Breaking changes (always avoid):**
- Renaming a field
- Changing field type (string → int)
- Removing a field without default
- Changing enum values (removing a symbol)

**Producer with Schema Registry (Java):**
```java
Properties props = new Properties();
props.put("schema.registry.url", "http://schema-registry:8081");
props.put("key.serializer", "io.confluent.kafka.serializers.KafkaAvroSerializer");
props.put("value.serializer", "io.confluent.kafka.serializers.KafkaAvroSerializer");

Producer<String, Order> producer = new KafkaProducer<>(props);
producer.send(new ProducerRecord<>("orders", order.getId(), order));
// Schema automatically registered/validated on first send
```

**Rule of thumb:** Use Avro + Schema Registry for production Kafka. FULL compatibility mode prevents breaking changes. Always add fields with defaults. Never rename or change field types. Schema Registry is the contract between producers and consumers. JSON only for development/debugging.
