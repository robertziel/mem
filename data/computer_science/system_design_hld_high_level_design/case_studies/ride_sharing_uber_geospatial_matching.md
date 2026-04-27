### System Design: Ride-Sharing (Uber)

**Requirements:**
- Riders request rides, drivers accept nearby requests
- Real-time location tracking for both
- Match rider to nearest available driver
- ETA calculation, fare estimation
- Ride tracking, payment processing

**High-level design:**
```
Rider App -> [API Gateway] -> [Ride Service]  -> [Matching Service]
Driver App -> [API Gateway] -> [Location Service] -> [Geospatial Index]
                               [Payment Service]
                               [Notification Service (push)]
                               [ETA/Routing Service]
```

**Key challenge: Geospatial indexing and matching**

**Geospatial approaches:**
| Approach | How | Tradeoff |
|----------|-----|----------|
| Geohash | Encode lat/lng into string prefix (e.g., "9q8yy") | Simple, works with Redis/DB prefix queries |
| Quadtree | Recursively divide 2D space into quadrants | Dynamic density, good for variable distribution |
| H3 (Uber's system) | Hexagonal hierarchical grid | Uniform distances, good for spatial analysis |
| PostGIS | Spatial extension for PostgreSQL | Full SQL, good for complex spatial queries |

**Geohash matching:**
```
1. Driver sends location every 5 seconds
2. Store in Redis: GEOADD drivers:available lng lat driver_id
3. Rider requests ride at (lat, lng)
4. Find nearby drivers: GEOSEARCH drivers:available FROMLONLAT lng lat BYRADIUS 5 km ASC COUNT 10
   (GEORADIUS is deprecated in Redis 6.2+ — use GEOSEARCH / GEOSEARCHSTORE)
5. Send request to nearest available driver
```

**Matching flow:**
```
1. Rider requests ride (pickup, destination)
2. Matching service finds N nearest available drivers
3. Send ride request to closest driver (push notification)
4. Driver has 15 seconds to accept
5. If declined/timeout -> send to next nearest driver
6. Driver accepts -> ride confirmed, start tracking
```

**Location tracking (high-frequency updates):**
- Driver sends GPS every 3-5 seconds during active ride
- Write to: Redis (current position) + Kafka (location history stream)
- Kafka consumers: update rider app, calculate ETA, detect route deviation
- Store ride path in time-series or append to ride record

**ETA calculation:**
- Graph-based routing (OSRM, Google Maps API, or internal routing engine)
- Real-time traffic adjustments
- Historical data for time-of-day patterns
- ML model for predicted travel time

**Fare calculation:**
```
fare = base_fare
     + (distance_km * per_km_rate)
     + (duration_min * per_min_rate)
     + surge_multiplier
     - promotions/discounts
```

**Surge pricing:**
- Supply (available drivers) vs demand (ride requests) per geohash zone
- High demand / low supply → surge multiplier (1.5x, 2x, etc.)
- Recalculated every few minutes per zone

**Scaling:**
- Location updates: Kafka (handles millions of events/sec)
- Driver positions: Redis Geo (in-memory, fast radius queries)
- Ride data: PostgreSQL/DynamoDB sharded by city or region
- Matching: per-city service instances (geographic partitioning)

**Rule of thumb:** Geohash + Redis GEOSEARCH (GEORADIUS is deprecated since Redis 6.2) for nearby driver matching. Kafka for high-frequency location streams. Partition by city/region for scaling. Push notifications for time-sensitive driver matching. The core innovation is the geospatial index, not the booking flow.
