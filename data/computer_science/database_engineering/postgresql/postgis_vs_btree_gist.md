### PostGIS vs `btree_gist` (PostgreSQL)

**Two extensions, two different jobs — often used together:**

| Extension | What it adds | When you need it |
|---|---|---|
| **`postgis`** | Spatial types (`geometry`, `geography`), `ST_*` functions, GiST support **for spatial columns** | Any spatial data |
| **`btree_gist`** | GiST operator classes for **scalar** types (`int`, `text`, `timestamp`, `date`, …) | When you need a multicolumn GiST index that mixes scalar + spatial |

**Decision matrix:**

| Use case | Need `postgis` | Need `btree_gist` |
|---|---|---|
| Geom-only GiST index | ✅ | ❌ |
| Multicolumn GiST `(timestamp, geom)` | ✅ | ✅ |
| Exclusion constraint on `tstzrange` only | ❌ | ✅ |
| Exclusion constraint mixing `int` + `tstzrange` | ❌ | ✅ |
| Exclusion constraint mixing `geom` + `int` | ✅ | ✅ |
| Plain B-tree on `(timestamp, status)` | ❌ | ❌ — use B-tree, not GiST |

**Enable extensions:**

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

**Index examples:**

```sql
-- Spatial-only GiST (postgis)
CREATE INDEX events_geom_gist
  ON events USING GIST (geom);

-- Mixed scalar + spatial (postgis + btree_gist)
CREATE INDEX events_valid_at_geom_gist
  ON events USING GIST (valid_at, geom);

-- Exclusion constraint: prevent overlapping reservations per room
ALTER TABLE bookings
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING GIST (
    room_id   WITH =,        -- needs btree_gist
    duration  WITH &&         -- range overlap; built into GiST
  );
```

**Common spatial operators (PostGIS):**

| Operator | Meaning |
|---|---|
| `&&` | Bounding boxes intersect |
| `<->` | Distance (use with `ORDER BY ... <-> point LIMIT N` for k-NN) |
| `ST_Intersects(a, b)` | Geometries intersect |
| `ST_DWithin(a, b, dist)` | Within distance (uses spatial index) |
| `ST_Contains(a, b)` / `ST_Within(b, a)` | Geometric containment |
| `ST_Distance(a, b)` | Distance (no index) |

**Index types in PostgreSQL — pick by data:**

| Index | Use for |
|---|---|
| **B-tree** (default) | Equality + range on scalar columns |
| **GiST** | Generic geometric / range / nearest-neighbor — extensible |
| **GIN** | Inverted index for arrays, JSONB, full-text |
| **SP-GiST** | Quad-trees, k-d trees, IP prefixes |
| **BRIN** | Append-mostly time-series; sparse summary blocks |
| **Hash** | Equality only; rarely beats B-tree |

**Performance note — GiST isn't a B-tree replacement:**

| Concern | Detail |
|---|---|
| GiST excels at multidimensional / overlap / nearest-neighbor | What spatial / range workloads need |
| GiST is **slower than B-tree** for pure equality / range on scalars | Don't replace B-trees with GiST hoping for speed |
| Mixed B-tree-GiST indexes via `btree_gist` | Useful only when one combined index serves multiple GiST-style queries |
| `EXPLAIN ANALYZE` proves the right pick | Always verify |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **k-nearest neighbor** | `ORDER BY geom <-> ST_Point(...) LIMIT 10` (uses GiST) |
| **Within-radius search** | `ST_DWithin(geom, point, meters)` |
| **Containment** | `ST_Contains(polygon, point)` |
| **Spatial join** | `WHERE ST_Intersects(a.geom, b.geom)` |
| **Time-window + geo** | Multicolumn GiST on `(valid_at, geom)` |
| **No double-booking** | Exclusion constraint with `EXCLUDE USING GIST` |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting `btree_gist` for mixed columns | Index creation fails ("data type X has no default operator class for access method GiST") |
| Replacing all B-trees with GiST | Slower for pure scalar queries |
| Using `geometry` for global data | SRID confusion; consider `geography` for distance in meters |
| Indexing on `ST_Distance(...)` instead of `<->` | Doesn't use the index |
| `ST_Buffer(point, dist)` for proximity | `ST_DWithin` is faster + uses index |
| Not running `VACUUM ANALYZE` after bulk insert | Plans wrong; spatial scans full table |

**Cross-references:**

- Geospatial system design (geohash / quadtree / S2 / H3): [proximity_service_*.md](../../system_design_hld_high_level_design/case_studies/proximity_service_yelp_google_maps_geohash.md)
- Index types + sargability: [query_optimization_*.md](../query_optimization_explain_analyze_indexes.md)

**Rule of thumb:** **`postgis` for spatial columns, `btree_gist` to mix scalars into a GiST index** (especially exclusion constraints and multicolumn indexes). Keep **regular B-trees for plain scalar queries** — GiST isn't a free upgrade. Use spatial operators that **use the index** (`<->`, `&&`, `ST_DWithin`), not function-style ones (`ST_Distance`).
