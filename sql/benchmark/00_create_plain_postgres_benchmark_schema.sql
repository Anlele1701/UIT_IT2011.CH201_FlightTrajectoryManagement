\set ON_ERROR_STOP on

CREATE TABLE flights (
  id bigint PRIMARY KEY,
  flight_number varchar(20),
  flight_key varchar(64) UNIQUE NOT NULL,
  icao24 varchar(10) NOT NULL,
  callsign varchar(20),
  origin_country varchar(80),
  source varchar(30) NOT NULL,
  status varchar(20) NOT NULL,
  flight_date date,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL
);

CREATE TABLE benchmark_zone_polygons (
  zone_id bigint NOT NULL,
  zone_code varchar(30) NOT NULL,
  zone_name varchar(120) NOT NULL,
  zone_type varchar(30) NOT NULL,
  polygon_index integer NOT NULL,
  min_altitude_m double precision,
  max_altitude_m double precision,
  min_lon double precision NOT NULL,
  min_lat double precision NOT NULL,
  max_lon double precision NOT NULL,
  max_lat double precision NOT NULL,
  vertices_json jsonb NOT NULL,
  PRIMARY KEY (zone_id, polygon_index)
);

CREATE TABLE flight_points (
  id bigint NOT NULL,
  aircraft_id bigint,
  flight_id bigint,
  observed_at timestamptz NOT NULL,
  icao24 varchar(10) NOT NULL,
  callsign varchar(20),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  altitude_m double precision,
  geo_altitude_m double precision,
  ground_speed_ms double precision,
  heading_deg double precision,
  vertical_rate_ms double precision,
  on_ground boolean NOT NULL DEFAULT false,
  source varchar(30) NOT NULL DEFAULT 'opensky',
  raw_source jsonb,
  ingested_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_flight_points_id_observed_at PRIMARY KEY (id, observed_at),
  CONSTRAINT uq_flight_points_snapshot UNIQUE (icao24, observed_at, longitude, latitude)
);

CREATE INDEX idx_plain_pg_flights_status_date
  ON flights (status, flight_date);

CREATE INDEX idx_plain_pg_zone_code
  ON benchmark_zone_polygons (zone_code);

CREATE INDEX idx_plain_pg_points_observed_at
  ON flight_points (observed_at DESC);

CREATE INDEX idx_plain_pg_points_icao24_observed_at
  ON flight_points (icao24, observed_at DESC);

CREATE INDEX idx_plain_pg_points_flight_id_observed_at
  ON flight_points (flight_id, observed_at DESC);

CREATE INDEX idx_plain_pg_points_lat_lon
  ON flight_points (latitude, longitude);

CREATE OR REPLACE FUNCTION benchmark_haversine_m(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 2 * 6371000 * asin(
    sqrt(
      power(sin(radians((lat2 - lat1) / 2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians((lon2 - lon1) / 2)), 2)
    )
  );
$$;

CREATE OR REPLACE FUNCTION benchmark_point_in_polygon(
  point_lon double precision,
  point_lat double precision,
  vertices jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  vertex_count integer;
  i integer;
  j integer;
  xi double precision;
  yi double precision;
  xj double precision;
  yj double precision;
  intersects boolean;
  is_inside boolean := false;
BEGIN
  vertex_count := jsonb_array_length(vertices);

  IF vertex_count < 3 THEN
    RETURN false;
  END IF;

  j := vertex_count - 1;

  FOR i IN 0..vertex_count - 1 LOOP
    xi := (vertices -> i ->> 0)::double precision;
    yi := (vertices -> i ->> 1)::double precision;
    xj := (vertices -> j ->> 0)::double precision;
    yj := (vertices -> j ->> 1)::double precision;

    intersects := ((yi > point_lat) <> (yj > point_lat))
      AND (
        point_lon < ((xj - xi) * (point_lat - yi) / NULLIF(yj - yi, 0) + xi)
      );

    IF intersects THEN
      is_inside := NOT is_inside;
    END IF;

    j := i;
  END LOOP;

  RETURN is_inside;
END;
$$;
