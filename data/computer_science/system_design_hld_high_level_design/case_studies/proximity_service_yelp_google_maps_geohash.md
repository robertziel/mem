### System Design: Proximity Service (Yelp / Google Maps / Geohash)

**Scope:** "find nearby businesses within radius R, optionally filtered by category / rating / text". Read-heavy (99%+); businesses change rarely.

**Geospatial indexing approaches — pick by data shape:**

| Approach | How it works | Strengths | Weaknesses | Used by |
|---|---|---|---|---|
| **Geohash** | Interleave lat/lng bits, base32 → string; prefix = bounding box | Works with any DB, simple, sortable, cacheable | Boundary problem (need 9 cells); irregular cell sizes near poles | Many Redis-based systems |
| **Quadtree** | Recursively split 2D space into 4 quadrants; subdivide where dense | Adapts to density (deep in cities, shallow in rural) | Built in-memory; rebuild cost | Many in-house geo services |
| **R-tree** | Balanced tree of bounding rectangles | Native to spatial DBs; supports arbitrary shapes | Heavier than geohash for "points within radius" | PostGIS, Mongo `2dsphere`, ES `geo_shape` |
| **S2** | Sphere → Hilbert-curve-ordered cells, 31 levels | Globally consistent cell sizes; supports polygons | Steeper learning curve | Google Maps |
| **H3** | Hexagonal hierarchical cells, 16 levels | Uniform neighbors (6 in all directions); great for analytics | Hexagons don't tile a sphere perfectly (12 pentagons) | Uber, Foursquare |
| **k-d tree** | Recursive split alternating dimensions | Memory-efficient for static data | Imbalanced after many updates | Embedded / static datasets |

**Geohash precision quick-reference:**

| Length | Cell size (mid-latitudes) | Use |
|---|---|---|
| 4 chars | ~39 km × 20 km | City-level search |
| 5 chars | ~5 km × 5 km | Neighborhood |
| 6 chars | ~1.2 km × 0.6 km | "Within 1 km" |
| 7 chars | ~150 m × 150 m | Walking-distance |
| 8 chars | ~38 m × 19 m | Pin-level |

**The boundary problem (always present with grid-based indexes):**

A point near a cell edge has its real neighbors in the **adjacent cell**, not just its own. Solution: query own cell + 8 neighbors (3×3 grid) and post-filter by exact distance.

```
┌─────┬─────┬─────┐
│ NW  │  N  │ NE  │
├─────┼─────┼─────┤
│  W  │  ●  │  E  │   ← always query all 9 cells
├─────┼─────┼─────┤
│ SW  │  S  │ SE  │
└─────┴─────┴─────┘
```

**High-level architecture:**

```
Client → API Gateway → Search Service ── Geospatial Index (geohash / quadtree / S2)
                       Business Service ── Business DB
                                              │
                                    Elasticsearch (text + geo)
                                              │
                                          Redis cache
                                              │
                                            CDN (static assets)
```

**Two read paths — different storage:**

| Path | Query | Storage |
|---|---|---|
| **Proximity** | "Show restaurants within 1 km of `(lat, lng)`" | Geospatial index (geohash / quadtree / H3) |
| **Text + geo** | "Best sushi downtown" | Elasticsearch with `geo_distance` filter |
| **Business detail** | "Open hours, photos, reviews for biz_123" | Business DB (read replica) + CDN for assets |

**Search-by-geohash (relational example):**

```sql
SELECT id, name, lat, lng, rating
FROM businesses
WHERE geohash5 IN ('9q8yy', '9q8yz', '9q8yw', ...)  -- center + 8 neighbors at len-5
  AND category = 'restaurant'
ORDER BY <distance(lat, lng, ?, ?)> ASC
LIMIT 20;
```

Index on `(geohash5, category)`; compute exact distance only for the candidate set, not the whole DB.

**Write path (business updates) — eventual consistency is fine:**

| Step | What happens |
|---|---|
| 1 | Business POSTs new/updated listing → Business DB write |
| 2 | Async event → re-index in Elasticsearch + geospatial index |
| 3 | Cache invalidation (Redis: drop `(geohash, category)` keys overlapping the change) |
| 4 | Re-render CDN-cached detail page (or wait for TTL) |

> Reads vastly outnumber writes (~10⁵:1). Optimize the read side; tolerate seconds-to-minutes of write lag.

**Caching layers:**

| Layer | What | TTL |
|---|---|---|
| CDN | Business detail pages, photos | ~1 h |
| Redis | Search results keyed by `(geohash, category, radius)` for popular areas | 1–10 min |
| Redis | Hot business detail summaries | 5 min |
| Application memory | Per-request quadtree (reloaded on schedule) | Build at startup, refresh hourly |

**Scaling levers:**

| Pressure | Lever |
|---|---|
| Read QPS | CDN + Redis + read replicas (most cities are read-cacheable) |
| Hot city (NYC, Tokyo, SF) | Shard geo index by city/region; dedicated cache for hot areas |
| Text search load | Separate ES cluster, sharded by `(country, city)` |
| Write throughput | Async write fan-out (DB → message bus → ES + geo + cache invalidation) |
| Map tile rendering | Pre-rendered tile cache (vector tiles via Mapbox/MapLibre) |

**Common interview tradeoffs:**

| Question | Tradeoff |
|---|---|
| Geohash vs quadtree | Geohash: simple, any DB. Quadtree: handles density variance |
| Cell size | Smaller = fewer false positives + more 9-neighbor queries; bigger = the reverse |
| Eventual vs strong consistency | Eventual is fine — businesses don't move every second |
| Pre-compute popular areas | Yes for top-K cities; on-demand for the long tail |
| ES vs PostGIS for geo+text | PostGIS for exact polygons / strong consistency; ES for ranked text + geo |

**Pitfalls:**

| Pitfall | Why |
|---|---|
| Querying only the center cell | Misses neighbors at edges (the boundary problem) |
| Exact distance filter on every row in the table | Full scan — must narrow with geohash/index first |
| Geohash near the dateline / poles | Discontinuities — explicit handling or use S2 |
| Rebuilding the entire quadtree on every write | Incremental rebuild affected leaves only |
| Caching radius-N results when caller asked for radius-M (M < N) | Cache key must include `radius` |

**Rule of thumb:** **geohash for simple radius search (prefix match + 9-cell neighbor query), quadtree for variable density, H3/S2 when you need globally consistent cell sizes.** Always **expand to neighbor cells** to avoid edge misses, then **post-filter by exact distance**. Use **Elasticsearch when text + geo overlap**; **PostGIS when polygons or strong consistency matter**. Cache the heck out of popular cities — businesses don't move.
