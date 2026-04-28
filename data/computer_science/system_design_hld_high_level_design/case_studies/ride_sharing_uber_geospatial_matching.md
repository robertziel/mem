### System Design: Ride-Sharing (Uber / Lyft / Bolt) — Geospatial Matching

**Scope:** rider requests pickup → match with a nearby available driver → real-time location tracking → ETA + fare → payment.

**Architecture:**

```
Rider App ─► API Gateway ─► Ride Service ──► Matching Service
                                              │
Driver App ─► API Gateway ─► Location Service ─► Geo Index (Redis Geo / H3)
                                              │
                                          ETA / Routing
                                              │
                              Payment · Notification · Surge Pricing
                                              │
                                Kafka (location stream, ride events)
```

**Component map:**

| Component | Job |
|---|---|
| Ride Service | Lifecycle of a ride (request → match → in-progress → ended → paid) |
| Location Service | High-frequency driver position updates |
| **Geo Index** | "Find drivers within R of (lat, lng)" — the core data structure |
| Matching Service | Choose driver(s); send ride offers; handle accept/decline/timeout |
| ETA / Routing | Graph routing + traffic for pickup ETA + trip duration |
| Surge Service | Supply vs demand per zone → multiplier |
| Notification Service | Push to driver app (ride offer is time-critical) |
| Payment Service | Pre-auth at request, capture at trip end |

**Geospatial index — pick by need:**

| Index | How | Strength | Weakness |
|---|---|---|---|
| **Geohash** (string prefix) | Interleave lat/lng bits → base32 | Simple, sortable, works in any KV/DB | Cell sizes vary near poles; needs 9-cell neighbor lookup |
| **Quadtree** | Recursive 4-way split | Adapts to density (deep in cities) | In-memory, rebuild cost |
| **H3** (Uber's choice) | Hexagonal hierarchical grid | Uniform neighbor distance (6 in all directions); great for analytics | 12 pentagons exist (artifact of tiling a sphere with hexagons) |
| **S2** (Google) | Hilbert-curve cells, 31 levels | Globally consistent, supports polygons | Steeper to learn |
| **PostGIS** | R-tree on PG | Full SQL + geometry/topology | Heavier; slower than in-memory for hot lookups |
| **Redis GEO** | Geohash + sorted set | Fast `GEOSEARCH BYRADIUS` in memory; production-ready out of the box | Single node has limits; cluster sharding by zone |

> **Cross-ref:** see [proximity_service_yelp_google_maps_geohash.md](proximity_service_yelp_google_maps_geohash.md) for deeper geohash details, the boundary problem, and S2/H3 comparison.

**Driver location update flow (high-frequency writes):**

| Step | Detail |
|---|---|
| 1 | Driver app sends GPS every 3–5 s (active) / 30 s (online idle) / off (offline) |
| 2 | Location Service writes **current position** to Redis Geo: `GEOADD drivers:zone:<id> lng lat driver_id` |
| 3 | Same event published to Kafka (`driver.location` topic) for analytics + ETA recalc + path replay |
| 4 | TTL on the Redis entry (`EXPIRE 15 s`) — no update = considered offline |
| 5 | Per-zone shards keep the hot key small |

> **Two stores, two purposes:** Redis is the *current* position (read-mostly hot path). Kafka is the *history* stream (warehouse, analytics, route replay).

**Matching flow:**

| Step | Detail |
|---|---|
| 1 | Rider requests ride (`pickup_lat/lng`, `dropoff_lat/lng`) |
| 2 | Matching Service: `GEOSEARCH drivers:zone:<z> FROMLONLAT … BYRADIUS 5km ASC COUNT 10` (Redis 6.2+ — `GEORADIUS` is deprecated) |
| 3 | Filter for `available` + `eligible` (vehicle type, rating threshold, ride history) |
| 4 | Score by distance, recent acceptance rate, ETA |
| 5 | Send offer to top driver via push (FCM/APNs) |
| 6 | Driver has ~15 s to accept |
| 7 | On decline / timeout → next driver |
| 8 | On accept → ride confirmed, both apps start live tracking |

**Matching strategies — tradeoffs:**

| Strategy | Pros | Cons |
|---|---|---|
| **Sequential nearest** | Simple, fair to closest | Slow if nearest declines; total ETA grows |
| **Broadcast to top-N** | Fast accept | Driver fairness issues; multiple wakeups |
| **Auction / batched matching** (Uber's "global optimization") | Higher overall throughput; better surge utilization | Adds 5–10 s of batching latency; complex |
| **Reservation queue** for high-demand events (concerts, surge) | Fair, predictable | Riders wait |

**Live tracking — what each side sees:**

| Endpoint | Data flow |
|---|---|
| Driver → server | GPS every 3–5 s |
| Server → rider | Driver position via WebSocket / push, throttled to ~1 Hz |
| ETA recalculator | Subscribe to `driver.location` stream; recompute every 10–30 s |
| Route deviation detector | Compare to expected polyline; alert on big offset |

**ETA calculation:**

| Input | Source |
|---|---|
| Road network graph | OSM-derived (OSRM / Valhalla) or proprietary |
| Real-time traffic | Aggregate from active fleet's actual speeds |
| Historical patterns | Time-of-day, day-of-week, weather |
| Predicted travel time | ML regressor over the above |

**Fare calculation:**

```
fare = base_fare
     + distance_km × per_km_rate
     + duration_min × per_min_rate
     + booking_fee
     + tolls
     − promotions / credits
final_fare = fare × surge_multiplier   (if surge active in pickup zone)
```

| Component | Notes |
|---|---|
| Base + distance + time | The deterministic part — same per ride type |
| Surge multiplier | Zone- + time-dependent; capped (e.g. 5×) |
| Tolls | Auto-detected from polyline against toll-zone polygons |
| Promotions / credits | Applied at fare display, settled at ride end |
| Driver vs rider fare | Different — platform takes commission, sometimes shows different surge to each |

**Surge pricing:**

| Mechanism | Detail |
|---|---|
| Signal | `(rider_requests / available_drivers)` per zone × time bucket |
| Window | 1–5 min sliding |
| Action | Multiplier `1×` → `1.5×` → `2×` (capped) |
| Geometry | Zone defined by H3/geohash cell, sometimes overlapping for soft transitions |
| Communication | Show surge **before** rider confirms; lock in for that ride |

**Payment flow:**

| Step | When |
|---|---|
| Pre-authorize | At ride request — verify card, hold an estimate |
| Capture | At ride end — actual fare may differ (route, tolls) |
| Driver payout | Settled in batches (daily / weekly) |
| Refunds | Trip dispute resolution; partial reverse |
| Idempotency | `ride_id` as the key — retries safe end-to-end |

**Scaling levers:**

| Pressure | Lever |
|---|---|
| Location update QPS (millions/sec globally) | Geo-shard Redis by **city / region**; per-shard Kafka partitions |
| Matching latency | Per-city matching service; pre-filtered driver pool |
| Ride storage | Sharded DB by city; cold ride history → warehouse (analytics, Kafka → S3) |
| Surge computation | Stream processor (Flink) over location + request streams; per-zone state |
| Notifications | Dedicated push fleet; per-region rate limiting |
| Map/routing API | Cached graphs per region; tile cache |

**Per-zone partitioning is the central trick:**

| Choice | Why |
|---|---|
| Shard everything (Redis, DB, services) by **zone / city / region** | Hot spots stay local; one city's surge doesn't blow up another's matching |
| Cross-zone rides (rare — long airport runs) handled by routing through a global service | Edge case |
| Drivers near zone boundaries indexed in both | Avoid border misses |

**Reliability concerns:**

| Failure | Handling |
|---|---|
| Driver phone goes offline mid-ride | Last known position, ETA falls back to historical estimate |
| GPS drift (urban canyons) | Map-matching to roads; average over recent points |
| Rider app loses connection during request | Re-fetch ride state on reconnect (idempotent) |
| Matching service down | Fall back to per-zone replicas; degrade to longer ETA windows |
| Push notification missed by driver | Auto-decline after 15 s; re-route |
| Payment auth fails post-match | Cancel ride, notify both, refund any hold |

**Data privacy / safety:**

| Concern | Mechanism |
|---|---|
| Driver / rider PII | Anonymized to the other side (name shown, phone proxied via masked number) |
| Trip history retention | Limited per regulation (GDPR, CCPA) |
| Live trip sharing | Time-limited URL with read-only token |
| Hailing-from-airport queues | FIFO virtual queue per airport zone |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Single Redis Geo for whole world | Hot key; long latency on `GEOSEARCH` |
| Sequential matching only | Slow under high decline rates |
| Updating driver position synchronously to DB | Write amplification; use Redis + Kafka pattern |
| No TTL on driver position | Stale offline drivers in matches |
| Computing ETA at request time only | Stale by ride end — recompute periodically |
| Surge cap missing | PR disaster; some markets regulate caps |
| Using `GEORADIUS` (deprecated since Redis 6.2) | Migration debt; switch to `GEOSEARCH` |

**Rule of thumb:** **per-city sharding everywhere** — hot locality is what makes the math tractable. **Redis Geo (`GEOSEARCH`) for the matching hot path; Kafka for the location stream.** Match by **distance + acceptance-rate + ETA score**, not just nearest. **Surge per zone, capped, communicated before booking.** **Pre-auth payment at request, capture at end** — fares change with the route. The interesting engineering is the geospatial index and per-zone partitioning; the booking flow is the easy part.
