\set ON_ERROR_STOP on

-- Same scenario as the PostgreSQL version, but using TimescaleDB time_bucket.

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  time_bucket(:'bucket_size'::interval, observed_at) AS bucket_start,
  COUNT(DISTINCT icao24) AS aircraft_count
FROM flight_points
WHERE observed_at >= :'from_ts'::timestamptz
  AND observed_at < :'to_ts'::timestamptz
GROUP BY 1
ORDER BY 1;
