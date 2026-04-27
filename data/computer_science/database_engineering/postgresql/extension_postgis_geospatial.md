### PostgreSQL Extension: PostGIS (Geospatial)

```sql
CREATE EXTENSION postgis;

ALTER TABLE stores ADD COLUMN location geography(POINT, 4326);

-- Find stores within 5km
SELECT name, ST_Distance(location, ST_MakePoint(-122.4, 37.7)::geography) AS distance_m
FROM stores
WHERE ST_DWithin(location, ST_MakePoint(-122.4, 37.7)::geography, 5000)
ORDER BY distance_m;
```

**Rule of thumb:** PostGIS for geospatial queries (distance, within radius, intersection). Full GIS capabilities within PostgreSQL. Use `geography` type for lat/lng on Earth (handles curvature), `geometry` for flat 2D calculations.
