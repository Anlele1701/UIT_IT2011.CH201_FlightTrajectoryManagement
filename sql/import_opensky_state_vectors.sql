\set ON_ERROR_STOP on

CREATE TEMP TABLE opensky_state_stage (
  time bigint,
  icao24 text,
  lat double precision,
  lon double precision,
  velocity double precision,
  heading double precision,
  vertrate double precision,
  callsign text,
  onground boolean,
  alert boolean,
  spi boolean,
  squawk text,
  baroaltitude double precision,
  geoaltitude double precision,
  lastposupdate double precision,
  lastcontact double precision
);

\copy opensky_state_stage (time, icao24, lat, lon, velocity, heading, vertrate, callsign, onground, alert, spi, squawk, baroaltitude, geoaltitude, lastposupdate, lastcontact) FROM 'src/data/2020-05-04_flight_datas.csv' WITH (FORMAT csv, HEADER true)

WITH normalized_stage AS (
  SELECT
    lower(trim(icao24)) AS icao24,
    NULLIF(upper(trim(callsign)), '') AS normalized_callsign,
    to_timestamp(time) AS observed_at,
    (to_timestamp(time) AT TIME ZONE 'UTC')::date AS flight_date,
    lat,
    lon,
    velocity,
    heading,
    vertrate,
    onground,
    baroaltitude,
    geoaltitude,
    squawk,
    lastposupdate,
    lastcontact
  FROM opensky_state_stage
  WHERE time IS NOT NULL
    AND icao24 IS NOT NULL
    AND lat IS NOT NULL
    AND lon IS NOT NULL
), flight_candidates AS (
  SELECT
    MIN(icao24) AS icao24,
    normalized_callsign,
    flight_date,
    MIN(observed_at) AS first_seen_at,
    MAX(observed_at) AS last_seen_at,
    CASE
      WHEN normalized_callsign IS NULL THEN MIN(icao24) || ':UNKNOWN:' || flight_date::text
      ELSE normalized_callsign || ':' || flight_date::text
    END AS flight_key
  FROM normalized_stage
  GROUP BY
    normalized_callsign,
    flight_date
)
INSERT INTO flights (
  airline_id,
  aircraft_id,
  route_id,
  flight_number,
  flight_key,
  origin_airport_id,
  destination_airport_id,
  icao24,
  callsign,
  origin_country,
  source,
  scheduled_departure_at,
  estimated_departure_at,
  actual_departure_at,
  scheduled_arrival_at,
  estimated_arrival_at,
  actual_arrival_at,
  status,
  flight_date,
  first_seen_at,
  last_seen_at
)
SELECT
  NULL,
  NULL,
  NULL,
  normalized_callsign,
  flight_key,
  NULL,
  NULL,
  icao24,
  normalized_callsign,
  NULL,
  'opensky_csv',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'enroute',
  flight_date,
  first_seen_at,
  last_seen_at
FROM flight_candidates candidate
WHERE NOT EXISTS (
  SELECT 1
  FROM flights f
  WHERE f.flight_key = candidate.flight_key
     OR (
       candidate.normalized_callsign IS NOT NULL
       AND f.flight_number = candidate.normalized_callsign
       AND f.flight_date = candidate.flight_date
     )
);

WITH normalized_stage AS (
  SELECT
    lower(trim(icao24)) AS icao24,
    NULLIF(upper(trim(callsign)), '') AS normalized_callsign,
    to_timestamp(time) AS observed_at,
    lat AS latitude,
    lon AS longitude,
    COALESCE(geoaltitude, baroaltitude) AS altitude_m,
    geoaltitude AS geo_altitude_m,
    velocity AS ground_speed_ms,
    heading AS heading_deg,
    vertrate AS vertical_rate_ms,
    onground AS on_ground,
    squawk,
    baroaltitude,
    geoaltitude,
    lastposupdate,
    lastcontact,
    CASE
      WHEN NULLIF(upper(trim(callsign)), '') IS NULL THEN lower(trim(icao24)) || ':UNKNOWN:' || (to_timestamp(time) AT TIME ZONE 'UTC')::date::text
      ELSE NULLIF(upper(trim(callsign)), '') || ':' || (to_timestamp(time) AT TIME ZONE 'UTC')::date::text
    END AS flight_key
  FROM opensky_state_stage
  WHERE time IS NOT NULL
    AND icao24 IS NOT NULL
    AND lat IS NOT NULL
    AND lon IS NOT NULL
)
INSERT INTO flight_points (
  aircraft_id,
  flight_id,
  observed_at,
  icao24,
  callsign,
  latitude,
  longitude,
  altitude_m,
  geo_altitude_m,
  ground_speed_ms,
  heading_deg,
  vertical_rate_ms,
  on_ground,
  source,
  geom,
  geom_3d,
  raw_source
)
SELECT
  NULL,
  f.id,
  stage.observed_at,
  stage.icao24,
  stage.normalized_callsign,
  stage.latitude,
  stage.longitude,
  stage.altitude_m,
  stage.geo_altitude_m,
  stage.ground_speed_ms,
  stage.heading_deg,
  stage.vertical_rate_ms,
  stage.on_ground,
  'opensky_csv',
  ST_SetSRID(ST_MakePoint(stage.longitude, stage.latitude), 4326),
  CASE
    WHEN stage.altitude_m IS NULL THEN NULL
    ELSE ST_SetSRID(ST_MakePoint(stage.longitude, stage.latitude, stage.altitude_m), 4326)
  END,
  jsonb_build_object(
    'source', 'opensky_csv',
    'time', EXTRACT(EPOCH FROM stage.observed_at),
    'icao24', stage.icao24,
    'callsign', stage.normalized_callsign,
    'lat', stage.latitude,
    'lon', stage.longitude,
    'velocity', stage.ground_speed_ms,
    'heading', stage.heading_deg,
    'vertrate', stage.vertical_rate_ms,
    'onground', stage.on_ground,
    'squawk', stage.squawk,
    'baroaltitude', stage.baroaltitude,
    'geoaltitude', stage.geoaltitude,
    'lastposupdate', stage.lastposupdate,
    'lastcontact', stage.lastcontact
  )
FROM normalized_stage stage
LEFT JOIN flights f
  ON f.flight_key = stage.flight_key
ON CONFLICT ("icao24", "observed_at", "longitude", "latitude") DO NOTHING;

ANALYZE flights;
ANALYZE flight_points;

DROP TABLE opensky_state_stage;
