### Design an Unattended Retail / Vending Machine Network (high-scale IoT)

**Requirements:**
- 100K+ vending machines deployed globally (offices, transit, stadiums)
- Each reports inventory, sales, telemetry, diagnostics in near real-time
- Cashless payments (card, NFC, QR, wallets) with 99.9% success rate
- Remote diagnostics + predictive maintenance (reduce field visits)
- Dynamic pricing + restocking optimization
- Central dashboard for operators (what's low? what's broken? what's best-selling?)

**Architecture:**
```
┌─────────────┐   ┌────────────┐   ┌──────────────┐
│  Vending    │──>│ MQTT Broker│──>│ Ingestion    │
│  Machine    │   │ (EMQX,     │   │ (Kafka)      │
│  (edge)     │   │  AWS IoT)  │   │              │
│  - sensors  │   └────────────┘   └──────┬───────┘
│  - payment  │                            │
│  - OS/app   │          ┌─────────────────┼──────────────────┐
│  - OTA svc  │          ▼                 ▼                  ▼
└─────────────┘   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      ▲           │ Inventory /  │ │ Payment      │ │ Telemetry /  │
      │           │ Sales Service│ │ Service      │ │ Diagnostics  │
      │           │ (PostgreSQL) │ │ (Stripe etc) │ │ (TimescaleDB)│
      │           └──────┬───────┘ └──────────────┘ └──────┬───────┘
      │                  │                                  │
      │       ┌──────────┴──────────┬──────────────┐        │
      │       ▼                     ▼              ▼        ▼
      │ ┌──────────┐      ┌──────────────┐  ┌──────────────────────┐
      │ │ Operator │      │ Restocking   │  │ ML Predictive        │
      │ │ Dashboard│      │ Optimizer    │  │ Maintenance          │
      │ │          │      │ (route plan) │  │ (failure prediction) │
      │ └──────────┘      └──────────────┘  └──────────────────────┘
      │
      │ Commands (remote reboot, price update, OTA firmware)
      └─── via MQTT downlink, signed commands
```

**1. Edge device architecture:**
```
Each machine runs:
  - Firmware: payment terminal, motor controls, display
  - Telemetry agent: batches events, sends via MQTT when connected
  - Local SQLite: survives network outages (store-and-forward)
  - OTA update client: signed firmware from central service

Connectivity:
  - Primary: 4G/5G modem (most machines, especially outdoor)
  - Fallback: Wi-Fi if available
  - Offline mode: up to 7 days of local operation, batch-upload on reconnect

Payment at the edge:
  - EMV card reader (Chip+PIN, contactless)
  - Payment processor (Stripe Terminal, Adyen, Worldpay)
  - Transaction authorized online; offline mode uses pre-authorized fallback limits
  - Encrypted tokens only — machine never sees raw PAN (PCI scope minimization)
```

**2. Telemetry ingestion at scale:**
```
Event types per machine:
  - Sale (product_id, price, payment_method, timestamp)
  - Inventory change (slot, new_count)
  - Error (motor jam, coin jam, cooling failure, low battery)
  - Diagnostic (temperature, door state, tamper, vibration)
  - Heartbeat (every 5 min)

Volume:
  100K machines × ~20 events/day avg = 2M events/day
  Peak (lunch rush): 10K events/sec globally

Transport: MQTT over TLS to cloud broker
  - AWS IoT Core or EMQX cluster
  - Each machine has client cert (mutual TLS)
  - MQTT QoS 1 (at-least-once) with local store-and-forward
  - Topic hierarchy: machines/{region}/{machine_id}/{event_type}

Ingestion:
  - MQTT broker → Kafka Connect → Kafka topics (partitioned by machine_id)
  - Flink stream processing for aggregations
```

**3. Inventory tracking — near real-time:**
```
Challenge: know what's in every slot of every machine, right now.

Approach:
  - Authoritative: machine's local count (it physically dispenses)
  - Reported to cloud every sale + hourly reconciliation
  - Cloud keeps running count (updated from sale events)

Periodic reconciliation:
  - Machine sends full inventory snapshot every hour
  - Cloud compares to its running count
  - Mismatch → alert (possible theft, mis-dispense, sensor failure)

Data:
  Redis: HSET inventory:{machine_id} slot_1 12 slot_2 8 ...  (hot reads)
  PostgreSQL: sales + inventory_snapshots tables (truth-of-record)
  TimescaleDB: inventory_history hypertable (trends for forecasting)

API for operator app:
  GET /machines/{id}/inventory → Redis → < 10ms
```

**4. Payment reliability (cashless is critical):**
```
Requirements:
  - 99.9% payment success during normal ops
  - Graceful offline: allow limited offline purchases (< $10) with later sync
  - No double-charge on network flap

Flow:
  1. Customer taps card → machine reads → tokenized
  2. Machine sends auth request via payment SDK
  3. Auth succeeds → dispense product → confirm capture
  4. Auth fails → display error, no dispense

Offline fallback:
  - If network unavailable: use offline fallback limit (e.g., $5 max)
  - Queue payment for later settlement (store-and-forward)
  - Accept risk: possibly can't collect if card is declined on settlement

Idempotency:
  - Each payment has idempotency_key = machine_id + local_tx_id
  - Network retry uses same key (no double-charge)

Monitoring:
  - Success rate per machine, per region, per payment method
  - Alert when machine success rate drops < 95% (hardware issue?)
```

**5. Predictive maintenance:**
```
Signals:
  - Motor current draw (creeping up = bearing wear)
  - Temperature patterns (cooling unit struggling)
  - Jam frequency (motor or product-guide issue)
  - Error codes over time

ML pipeline (Flink + Python):
  - Per-machine features updated hourly
  - Predict: probability of failure in next 7 days
  - High probability → work order auto-created
  - Technician dispatched before failure

Savings:
  - Predictive visit: planned, one trip with parts
  - Reactive visit: emergency, two trips (diagnose + return with parts)
  - Roughly halves field-service cost
```

**6. Restocking optimization:**
```
Data-driven restocking:
  - Per-machine sales velocity by product
  - Predicted depletion time per slot
  - Route optimizer (TSP with time windows)
  - Cluster machines by route, prioritize near-empty

Output:
  - Daily restock list per route driver
  - Optimal path, optimal product mix
  - Includes "adjust planogram" suggestions (swap slow-movers for fast-movers)

Reduces:
  - Stockouts (lost sales)
  - Wasted trips (restocking machines that still have stock)
  - Overall truck miles
```

**7. Dynamic pricing:**
```
Per-machine pricing based on:
  - Location (office lobby vs transit hub — different willingness to pay)
  - Time of day (morning coffee premium)
  - Weather (cold day = hot drinks surge)
  - Competitor proximity
  - Stockout risk (raise price on last units)

Implementation:
  - Pricing service computes optimal price per slot, updates daily
  - Pushed to machines via MQTT
  - Machine displays current price; sale recorded at dispensed price
  - Gradual changes (±5% max per day) — don't shock customers
```

**8. OTA (over-the-air) updates:**
```
Firmware / app updates:
  - Signed bundles (machine verifies ed25519 signature)
  - Staged rollout: canary 1% → 10% → 100% over days
  - Delta updates (only changed files, not full firmware)
  - Rollback on failure (A/B partition — like Android)

Critical: never brick a machine
  - Always keep last-known-good firmware
  - Health check after boot — if sanity checks fail, auto-rollback
  - Remote unbrick via secondary channel if needed (rare)
```

**9. Data model:**
```sql
-- Machines
CREATE TABLE machines (
  id               BIGINT PRIMARY KEY,
  serial_number    TEXT NOT NULL UNIQUE,
  location         GEOGRAPHY(POINT, 4326),
  firmware_version TEXT,
  last_seen_at     TIMESTAMPTZ,
  status           TEXT                -- active/offline/maintenance
);

-- Sales (append-only, high volume)
CREATE TABLE sales (
  id              BIGINT PRIMARY KEY,
  machine_id      BIGINT NOT NULL,
  product_id      BIGINT NOT NULL,
  price_cents     INT NOT NULL,
  payment_method  TEXT,
  payment_tx_id   TEXT,
  sold_at         TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (sold_at);

-- Inventory state
CREATE TABLE inventory_slots (
  machine_id    BIGINT NOT NULL,
  slot_number   INT NOT NULL,
  product_id    BIGINT NOT NULL,
  current_count INT NOT NULL,
  capacity      INT NOT NULL,
  last_updated  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (machine_id, slot_number)
);

-- Telemetry (TimescaleDB hypertable)
CREATE TABLE telemetry (
  machine_id   BIGINT NOT NULL,
  metric_name  TEXT NOT NULL,
  value        DOUBLE PRECISION,
  recorded_at  TIMESTAMPTZ NOT NULL
);
SELECT create_hypertable('telemetry', 'recorded_at');
```

**Capacity estimates:**
```
- Machines: 100K
- Events/sec peak: 10K (lunch rush globally)
- Storage: 2M events/day × 200 bytes = ~400 MB/day raw; ~150 TB over 1 year with telemetry
- MQTT connections: 100K persistent
- Mobile dashboard users: 5K operators → low traffic
- Public API: ~none (internal system)
```

**Rule of thumb:** IoT vending is a write-heavy telemetry problem — MQTT to ingest, Kafka to partition, Flink for stream processing, TimescaleDB for history. Each machine is partially autonomous (store-and-forward, offline fallback) — network is unreliable. Central services handle: inventory visibility, payment settlement, predictive maintenance (ML), restocking optimization (TSP), dynamic pricing, OTA updates. Minimize PCI scope by never seeing raw PAN at the machine — tokenize at the reader. Always design for offline operation — the network will drop.
