### PostGIS vs btree_gist

`postgis` and `btree_gist` solve different problems and are often used together.

- **`postgis`** -> adds spatial types/operators/functions (`geometry`, `geography`, `ST_*`, spatial GiST behavior).
- **`btree_gist`** -> adds GiST operator classes for scalar B-tree-like types (`timestamp`, `date`, `int`, `text`, etc.).
- **Rule** -> use `postgis` for spatial columns; add `btree_gist` when one GiST index mixes scalar + spatial columns.

### When you need each

- **Geom-only GiST index** -> needs `postgis`.
- **Multicolumn GiST `(valid_at, geom)`** -> needs both `postgis` and `btree_gist`.

### Real examples

Enable extensions:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

Geom-only spatial index:

```sql
CREATE INDEX idx_events_geom_gist
  ON events USING GIST (geom);
```

Mixed scalar + spatial GiST index:

```sql
CREATE INDEX idx_events_valid_at_geom_gist
  ON events USING GIST (valid_at, geom);
```

Nearest-neighbor query (spatial operator from PostGIS):

```sql
SELECT id
FROM events
ORDER BY geom <-> ST_SetSRID(ST_Point(-73.9857, 40.7484), 4326)
LIMIT 10;
```

### Gotcha

GiST is not a drop-in replacement for all B-tree workloads. Keep normal B-tree indexes for pure equality/range-heavy scalar queries unless query plans prove the mixed GiST index is better.
