\set ON_ERROR_STOP on

-- Same trajectory reconstruction benchmark for the TimescaleDB database.

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  f.id AS flight_id,
  f.flight_key,
  f.flight_number,
  MIN(fp.observed_at) AS started_at,
  MAX(fp.observed_at) AS ended_at,
  COUNT(*) AS point_count,
  ST_MakeLine(fp.geom ORDER BY fp.observed_at) AS trajectory_geom
FROM flights f
JOIN flight_points fp
  ON fp.flight_id = f.id
WHERE f.flight_key = :'flight_key'
GROUP BY f.id, f.flight_key, f.flight_number;
