\set ON_ERROR_STOP on

-- Required variables:
--   from_ts     : lower time bound
--   to_ts       : upper time bound
--   bucket_size : interval text, for example 10 minutes

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  date_bin(:'bucket_size'::interval, observed_at, '2000-01-01 00:00:00+00'::timestamptz) AS bucket_start,
  COUNT(*) AS point_count
FROM flight_points
WHERE observed_at >= :'from_ts'::timestamptz
  AND observed_at < :'to_ts'::timestamptz
GROUP BY 1
ORDER BY 1;
