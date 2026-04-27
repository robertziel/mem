### Design a Smart Parking System (City-scale IoT)

**Requirements:**
- Cover an entire city: 10M+ parking spaces (garages, street, private lots)
- Real-time availability (which spots are free right now?)
- Reservations with predicted availability
- Payment, enforcement (tickets for unpaid parking), dynamic pricing
- Serve 5M mobile users; peak during commute hours
- Integrate with IoT sensors (ground loops, cameras, payment meters)
- Publish open data feeds (city APIs for navigation apps like Google Maps)

**Architecture:**
```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│  IoT        │──>│  Edge / LPWAN│──>│ Ingestion    │
│  sensors    │   │  (LoRaWAN,   │   │ (Kafka)      │
│  (meters,   │   │   NB-IoT,    │   │              │
│   loops,    │   │   5G)        │   │              │
│   cameras)  │   └──────────────┘   └──────┬───────┘
└─────────────┘                              │
                                             ▼
                    ┌────────────────────────────────────┐
                    │  Stream Processing (Flink)         │
                    │  - Occupancy state machine         │
                    │  - Anomaly detection (broken sensor)│
                    │  - Rolling aggregations            │
                    └────────────┬───────────────────────┘
                                 │
        ┌────────────────────────┼──────────────────────┐
        ▼                        ▼                      ▼
┌──────────────────┐   ┌─────────────────┐   ┌──────────────────┐
│ Spot state       │   │ Time-series     │   │ Reservation      │
│ (Redis + geo     │   │ (TimescaleDB)   │   │ Service          │
│  index + bitmap) │   │ — occupancy     │   │ (Postgres +      │
│  — hot reads     │   │   history, ML   │   │  Redis locks)    │
└────────┬─────────┘   └────────┬────────┘   └──────┬───────────┘
         │                      │                    │
         ▼                      ▼                    ▼
┌──────────────────┐   ┌──────────────────┐  ┌──────────────────┐
│ Mobile API       │   │ Prediction       │  │ Payment          │
│ (nearby spots,   │   │ Service (will    │  │ (Stripe + parking│
│  reserve, pay)   │   │ this spot be    │  │  meter protocols)│
│                  │   │ free at 3pm?)    │  │                  │
└──────────────────┘   └──────────────────┘  └──────────────────┘
```

**1. IoT sensor ingestion:**
```
Sensor types:
  - Ground loops (magnetic, detect car presence; long battery life, low bandwidth)
  - Ultrasonic (ceiling/mounted, garages)
  - Computer vision (cameras + ML, for street parking at scale)
  - Smart meters (user-initiated, know when someone pays)

Networking:
  - LoRaWAN / NB-IoT / LTE-M — low-power, low-bandwidth, city-wide coverage
  - Cheap cellular modems for small volumes
  - Wi-Fi mesh for garages

Message format:
  { sensor_id, occupied: bool, battery_pct, rssi, timestamp }

Ingestion rate:
  10M sensors × 1 report/5 min average = ~33K msgs/sec
  Burst (morning rush, all events firing): 500K msgs/sec
  Kafka partitioned by sensor_id (ordered per-sensor)
```

**2. Occupancy state (hot path):**
```
Challenge: 5M users query "spots near me" — hit every few seconds.

Redis structures:
  - GEO index: GEOADD spots:city:{city_id} lon lat spot_id
    Query: GEOSEARCH spots:sfo FROMLONLAT -122.4 37.7 BYRADIUS 500 m
  - Availability hash per spot: HSET spot:{id} status free price_cents 300
  - Bitmap per block/zone: BITCOUNT zone:financial_district:free

Read path:
  Mobile → API → Redis (p99 < 10ms)
  Return: [{ spot_id, distance, price, type }, ...]

Write path:
  Sensor event → Kafka → Flink → Redis update
  Latency: ~1-2s from sensor event to visible in mobile app

Accuracy trade-off:
  - Street parking: stale by up to 60s (someone moved, sensor hasn't reported yet)
  - Garages: near real-time (seconds)
  - Predictive overlay: if "75% likely free in 5 min", show with lower confidence
```

**3. Reservation — distributed locking for spots:**
```
Problem: two users try to reserve the same spot.

Flow:
  1. User selects spot, requests reserve
  2. Reservation service: SET reservation:{spot_id} {user_id} NX EX 300
     (5-min hold for user to arrive)
  3. If SET fails (key exists) → "someone just reserved, pick another"
  4. User arrives: sensor detects car → release hold, start billing
  5. User doesn't arrive in 5 min → auto-release, charge no-show fee

Scaling:
  - Reservations sharded by spot_id hash
  - No hot-spot unless a single spot is repeatedly contested (rare)
  - For popular events: add reservation queue with FIFO admission

Persistence:
  - Redis = fast path (hold TTL)
  - PostgreSQL = source of truth (audit, billing, historical)
  - Write-through: every reservation written to both atomically
```

**4. Predictive availability (will this spot be free at 3pm?):**
```
Why: navigation apps (Google Maps) need predicted availability, not just now.

ML features per spot (or per zone):
  - Hour of day, day of week, weather
  - Current occupancy, trailing 30-min turnover rate
  - Nearby events (concerts, sports, holidays)
  - Historical same-time-last-week
  - Construction / closures (city data feed)

Model: gradient boosting per-zone, updated daily
Prediction API: GET /predict?location=X&at=3pm → {probability_free: 0.62, confidence: 0.8}

Served as pre-computed heatmap tiles:
  - Flink batches compute 24-hour forecast per zone every hour
  - Results in Redis, tile-indexed (like map tiles)
  - Mobile client requests tiles for visible map area
  - Sub-ms lookups at mobile API layer
```

**5. Payment + enforcement:**
```
Payment flow:
  1. User arrives, app detects sensor state change (or user manually starts)
  2. Backend creates session: session_id, spot_id, start_time, hourly_rate
  3. Continuous billing: charge every hour (or at session end)
  4. User extends: just update end_time in DB
  5. User leaves: sensor detects free → end session → final charge

Dynamic pricing:
  - Base rate + surge multiplier (like Uber)
  - Multiplier driven by: current occupancy, time of day, nearby demand
  - Higher prices during peak → smooths demand

Enforcement (unpaid parking):
  - Camera LPR (license plate recognition) patrols
  - Paired with session DB: is this plate paid right now?
  - If unpaid → issue ticket (digital notification + mail)
  - Appeal process in the app
```

**6. Data model:**
```sql
-- Spots (geospatial)
CREATE TABLE spots (
  id            BIGINT PRIMARY KEY,
  lot_id        BIGINT,
  spot_type     TEXT NOT NULL,   -- street, garage, ev_charger, disabled
  location      GEOGRAPHY(POINT, 4326) NOT NULL,
  base_rate_cents INT NOT NULL,
  sensor_id     TEXT
);
CREATE INDEX idx_spots_location ON spots USING GIST (location);

-- Sessions (active + completed parking sessions)
CREATE TABLE parking_sessions (
  id                BIGINT PRIMARY KEY,
  spot_id           BIGINT NOT NULL,
  user_id           BIGINT,
  license_plate     TEXT,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ,
  total_cents       BIGINT,
  payment_status    TEXT NOT NULL    -- active/paid/unpaid/disputed
);

-- Sensor events (append-only, TimescaleDB hypertable)
CREATE TABLE sensor_events (
  sensor_id   TEXT NOT NULL,
  event_time  TIMESTAMPTZ NOT NULL,
  occupied    BOOLEAN NOT NULL,
  battery_pct INT,
  rssi        INT
);
SELECT create_hypertable('sensor_events', 'event_time');

-- Reservations
CREATE TABLE reservations (
  id          BIGINT PRIMARY KEY,
  spot_id     BIGINT NOT NULL,
  user_id     BIGINT NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL      -- active/fulfilled/expired/cancelled
);
```

**7. Open data & integrations:**
```
Public data feed (for navigation apps):
  - GTFS-like static feed (spot locations, types, rates)
  - GBFS-style real-time feed (occupancy deltas)
  - Pushed to partners (Google, Apple Maps) via SSE/webhook
  - Rate-limited public API

Navigation integration:
  - When user searches for destination
  - Partner app queries our "nearby availability" API
  - Shows parking alongside driving directions
```

**8. Scaling characteristics:**
```
- Sensor ingestion: partitioned by sensor_id → linear scale
- Spot reads: Redis geo queries → 100K+ req/sec per shard
- Reservations: sharded by spot_id → no hot-spots usually
- Payments: async via queue (don't hold DB through Stripe)
- Predictions: pre-computed per-zone → cheap serves

Degraded modes:
  - Sensor offline: mark as "availability unknown" (don't lie)
  - Flink lag: mobile app shows last-known state + timestamp
  - Redis down: fall back to PostgreSQL (slower but correct)
```

**Rule of thumb:** IoT ingestion is a classic write-heavy stream problem — Kafka partitioned by sensor_id, Flink for state machines, TimescaleDB for history. Hot reads (5M mobile users querying "near me") served from Redis with GEO + bitmap structures; PostgreSQL is async source-of-truth. Reservations use distributed locks with short TTL. Predictive availability (ML) served from pre-computed tiles, not computed per-request. Dynamic pricing smooths demand. Fail gracefully — never show "free" for a spot you can't verify.
