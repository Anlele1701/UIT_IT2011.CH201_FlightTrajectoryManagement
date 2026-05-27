\set ON_ERROR_STOP on

-- Required variables:
--   flight_key : flight key from the flights table

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  f.id AS flight_id,
  f.flight_key,
  f.flight_number,
  MIN(fp.observed_at) AS started_at,
  MAX(fp.observed_at) AS ended_at,
  COUNT(*) AS point_count,
  jsonb_agg(
    jsonb_build_object(
      'observed_at', fp.observed_at,
      'longitude', fp.longitude,
      'latitude', fp.latitude,
      'altitude_m', fp.altitude_m
    )
    ORDER BY fp.observed_at
  ) AS trajectory_points
FROM flights f
JOIN flight_points fp
  ON fp.flight_id = f.id
WHERE f.flight_key = :'flight_key'
GROUP BY f.id, f.flight_key, f.flight_number;
