\set ON_ERROR_STOP on

-- Required variables:
--   from_ts            : range start timestamp
--   to_ts              : range end timestamp
--   bucket_size        : interval size, intended to match the source sampling window
--   horizontal_radius_m: distance in meters, for example 5000
--   vertical_radius_m  : altitude difference in meters, for example 300
--
-- Recommended supporting index:
--   CREATE INDEX IF NOT EXISTS idx_flight_points_geom_geography
--   ON flight_points USING GIST ((geom::geography));

EXPLAIN (ANALYZE, BUFFERS)
WITH source_points AS (
  SELECT
    fp.id,
    fp.observed_at,
    time_bucket(:'bucket_size'::interval, fp.observed_at) AS bucket_start,
    fp.icao24,
    fp.altitude_m,
    fp.geom
  FROM flight_points fp
  WHERE fp.observed_at >= :'from_ts'::timestamptz
    AND fp.observed_at < :'to_ts'::timestamptz
    AND fp.on_ground = false
)
SELECT
  p1.bucket_start,
  COUNT(*) AS nearby_pair_count,
  COUNT(DISTINCT p1.icao24) + COUNT(DISTINCT p2.aircraft_b) AS aircraft_mentions,
  ROUND(MIN(p2.horizontal_distance_m)) AS min_horizontal_distance_m,
  ROUND(AVG(p2.horizontal_distance_m)) AS avg_horizontal_distance_m
FROM source_points p1
JOIN LATERAL (
  SELECT
    p2.icao24 AS aircraft_b,
    ST_Distance(p1.geom::geography, p2.geom::geography) AS horizontal_distance_m
  FROM flight_points p2
  WHERE p2.observed_at = p1.observed_at
    AND p2.on_ground = false
    AND p2.id > p1.id
    AND ABS(COALESCE(p1.altitude_m, 0) - COALESCE(p2.altitude_m, 0)) <= :'vertical_radius_m'::double precision
    AND ST_DWithin(
      p1.geom::geography,
      p2.geom::geography,
      :'horizontal_radius_m'::double precision
    )
) p2
  ON true
GROUP BY p1.bucket_start
ORDER BY p1.bucket_start;
