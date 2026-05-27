\set ON_ERROR_STOP on

-- Plain PostgreSQL version without PostGIS.
-- Required variables:
--   zone_code : zone code to test
--   from_ts   : lower time bound
--   to_ts     : upper time bound

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  fp.observed_at,
  fp.icao24,
  fp.callsign,
  fp.longitude,
  fp.latitude,
  zp.zone_code,
  zp.zone_name
FROM flight_points fp
JOIN benchmark_zone_polygons zp
  ON zp.zone_code = :'zone_code'
WHERE fp.observed_at >= :'from_ts'::timestamptz
  AND fp.observed_at < :'to_ts'::timestamptz
  AND fp.longitude BETWEEN zp.min_lon AND zp.max_lon
  AND fp.latitude BETWEEN zp.min_lat AND zp.max_lat
  AND (zp.min_altitude_m IS NULL OR fp.altitude_m IS NULL OR fp.altitude_m >= zp.min_altitude_m)
  AND (zp.max_altitude_m IS NULL OR fp.altitude_m IS NULL OR fp.altitude_m <= zp.max_altitude_m)
  AND benchmark_point_in_polygon(fp.longitude, fp.latitude, zp.vertices_json)
ORDER BY fp.observed_at, fp.icao24;
