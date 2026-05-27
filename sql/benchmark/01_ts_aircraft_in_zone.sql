\set ON_ERROR_STOP on

-- Same benchmark as 01_pg_aircraft_in_zone.sql, but intended for the TimescaleDB database.

EXPLAIN (ANALYZE, BUFFERS)
SELECT
  fp.observed_at,
  fp.icao24,
  fp.callsign,
  fp.longitude,
  fp.latitude,
  az.zone_code,
  az.name AS zone_name
FROM flight_points fp
JOIN airspace_zones az
  ON az.zone_code = :'zone_code'
WHERE fp.observed_at >= :'from_ts'::timestamptz
  AND fp.observed_at < :'to_ts'::timestamptz
  AND ST_Intersects(fp.geom, az.polygon_geom)
ORDER BY fp.observed_at, fp.icao24;
