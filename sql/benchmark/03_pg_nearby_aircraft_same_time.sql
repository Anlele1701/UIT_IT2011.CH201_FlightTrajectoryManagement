\set ON_ERROR_STOP on

-- Required variables:
--   from_ts            : range start timestamp
--   to_ts              : range end timestamp
--   bucket_size        : interval size, for example '10 seconds'
--   horizontal_radius_m: distance in meters, for example 5000
--   vertical_radius_m  : altitude difference in meters, for example 300

EXPLAIN (ANALYZE, BUFFERS)
WITH bucketed_points AS (
  SELECT
    fp.id,
    fp.observed_at,
    date_bin(
      :'bucket_size'::interval,
      fp.observed_at,
      TIMESTAMPTZ '2000-01-01 00:00:00+00'
    ) AS bucket_start,
    fp.icao24,
    fp.latitude,
    fp.longitude,
    fp.altitude_m
  FROM flight_points fp
  WHERE fp.observed_at >= :'from_ts'::timestamptz
    AND fp.observed_at < :'to_ts'::timestamptz
    AND fp.on_ground = false
),
nearby_pairs AS (
  SELECT
    p1.bucket_start,
    p1.observed_at AS observed_at_a,
    p2.observed_at AS observed_at_b,
    p1.icao24 AS aircraft_a,
    p2.icao24 AS aircraft_b,
    distance_calc.horizontal_distance_m,
    ABS(COALESCE(p1.altitude_m, 0) - COALESCE(p2.altitude_m, 0)) AS vertical_distance_m
  FROM bucketed_points p1
  JOIN bucketed_points p2
    ON p1.bucket_start = p2.bucket_start
   AND p1.id < p2.id
  JOIN LATERAL (
    SELECT benchmark_haversine_m(
      p1.latitude,
      p1.longitude,
      p2.latitude,
      p2.longitude
    ) AS horizontal_distance_m
  ) AS distance_calc
    ON true
  WHERE distance_calc.horizontal_distance_m <= :'horizontal_radius_m'::double precision
    AND ABS(COALESCE(p1.altitude_m, 0) - COALESCE(p2.altitude_m, 0)) <= :'vertical_radius_m'::double precision
)
SELECT
  bucket_start,
  COUNT(*) AS nearby_pair_count,
  COUNT(DISTINCT aircraft_a) + COUNT(DISTINCT aircraft_b) AS aircraft_mentions,
  ROUND(MIN(horizontal_distance_m)) AS min_horizontal_distance_m,
  ROUND(AVG(horizontal_distance_m)) AS avg_horizontal_distance_m
FROM nearby_pairs
GROUP BY bucket_start
ORDER BY bucket_start;
