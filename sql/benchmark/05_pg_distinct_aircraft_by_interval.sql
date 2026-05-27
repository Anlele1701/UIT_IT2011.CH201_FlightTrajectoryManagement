\set ON_ERROR_STOP on

-- Assumption for scenario 5:
-- Scenario 2 counts raw points per time bucket.
-- Scenario 5 counts distinct aircraft per time bucket.

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  date_bin(:'bucket_size'::interval, observed_at, '2000-01-01 00:00:00+00'::timestamptz) AS bucket_start,
  COUNT(DISTINCT icao24) AS aircraft_count
FROM flight_points
WHERE observed_at >= :'from_ts'::timestamptz
  AND observed_at < :'to_ts'::timestamptz
GROUP BY 1
ORDER BY 1;
