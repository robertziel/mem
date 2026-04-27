### System Design: Proximity Service (Yelp/Google Maps)

**Requirements:**
- Find nearby businesses/places within a radius
- Search by category, rating, distance
- Display on map, show details
- Business owners can add/update listings
- Handle millions of queries per day

**Geospatial indexing approaches:**

| Approach | How | Best for |
|----------|-----|----------|
| **Geohash** | Encode lat/lng to string, prefix = area | Simple, works with any DB |
| **Quadtree** | Recursive 2D space subdivision | Variable density areas |
| **R-tree** | Balanced tree of bounding rectangles | PostGIS, range queries |
| **S2/H3** | Sphere divided into cells | Google Maps (S2), Uber (H3) |

**Geohash deep dive:**
```
Latitude/Longitude -> Base32 string
(37.7749, -122.4194) -> "9q8yyk8"

Precision:
  4 chars -> ~39km × 20km cell
  5 chars -> ~5km × 5km cell
  6 chars -> ~1.2km × 0.6km cell
  7 chars -> ~150m × 150m cell

Nearby = same prefix:
  "9q8yyk" covers a ~1km area
  All businesses in "9q8yyk*" are nearby
```

**Searching nearby:**
```sql
-- Find businesses within geohash precision 6 (≈1km)
-- Must check neighboring cells too (boundary problem)
SELECT * FROM businesses
WHERE geohash LIKE '9q8yyk%'
   OR geohash LIKE '9q8yyj%'   -- neighbor cells
   OR geohash LIKE '9q8yym%'
   -- ... (8 neighbors + center = 9 cells)
AND category = 'restaurant'
ORDER BY rating DESC
LIMIT 20;
```

**High-level design:**
```
[Client] -> [API Gateway] -> [Search Service] -> [Geospatial Index]
                           -> [Business Service] -> [Business DB]
                                                     |
                                               [Elasticsearch]
                                               (text search + geo)
```

**Two read paths:**
1. **Proximity search**: "restaurants near me" → geospatial index (geohash/quadtree)
2. **Text search**: "best sushi downtown" → Elasticsearch with geo filter

**Quadtree (for variable density):**
```
Divide space into 4 quadrants.
If a quadrant has > N businesses, subdivide again.
Repeat until each leaf has ≤ N businesses.

Dense city center: deep tree (small cells)
Rural area: shallow tree (large cells)
```
- Built in-memory on server startup
- Rebuilt periodically (business changes are rare)
- Each leaf node stores list of business IDs

**Write path (business updates):**
- Business creates/updates listing → write to DB
- Async update geospatial index (rebuild affected cells)
- Businesses change rarely → eventual consistency is fine

**Caching:**
- Cache popular areas (city centers) in Redis
- Cache business detail pages (CDN, ~1 hour TTL)
- Geospatial results cacheable by (geohash, category, radius)

**Scaling:**
- Read-heavy system (99%+ reads)
- Shard geospatial index by region
- Read replicas for business DB
- Elasticsearch cluster for text + geo search
- CDN for static business content (photos, menus)

**Rule of thumb:** Geohash for simple radius search (prefix matching). Quadtree for variable-density areas. Always search neighboring cells (boundary problem). Elasticsearch combines text search with geo filtering. Businesses change rarely, so cache aggressively.
