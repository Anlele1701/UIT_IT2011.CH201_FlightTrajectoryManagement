#!/usr/bin/env bash

set -euo pipefail

SOURCE_DB="${SOURCE_DB:-flight_trajectory}"
TARGET_DB="${TARGET_DB:-flight_trajectory_pg_plain}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_SQL="$ROOT_DIR/sql/benchmark/00_create_plain_postgres_benchmark_schema.sql"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

export PGPASSWORD="$DB_PASSWORD"

echo "Recreating plain PostgreSQL benchmark database: $TARGET_DB"
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TARGET_DB;"
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE $TARGET_DB;"

echo "Creating plain benchmark schema"
psql -h "$DB_HOST" -U "$DB_USER" -d "$TARGET_DB" -f "$SCHEMA_SQL"

echo "Exporting benchmark data from source database: $SOURCE_DB"
psql -h "$DB_HOST" -U "$DB_USER" -d "$SOURCE_DB" -c "\\copy (SELECT id, flight_number, flight_key, icao24, callsign, origin_country, source, status, flight_date, first_seen_at, last_seen_at FROM flights ORDER BY id) TO '$TMP_DIR/flights.csv' WITH CSV HEADER"

psql -h "$DB_HOST" -U "$DB_USER" -d "$SOURCE_DB" -c "\\copy (
  WITH dumped AS (
    SELECT
      az.id AS zone_id,
      az.zone_code,
      az.name AS zone_name,
      az.zone_type,
      az.min_altitude_m,
      az.max_altitude_m,
      ROW_NUMBER() OVER (PARTITION BY az.id ORDER BY (dumped_geom).path) AS polygon_index,
      (dumped_geom).geom AS polygon_geom
    FROM airspace_zones az
    CROSS JOIN LATERAL ST_Dump(az.polygon_geom) AS dumped_geom
  )
  SELECT
    zone_id,
    zone_code,
    zone_name,
    zone_type,
    polygon_index,
    min_altitude_m,
    max_altitude_m,
    ST_XMin(polygon_geom) AS min_lon,
    ST_YMin(polygon_geom) AS min_lat,
    ST_XMax(polygon_geom) AS max_lon,
    ST_YMax(polygon_geom) AS max_lat,
    (
      SELECT jsonb_agg(
        jsonb_build_array(
          ST_X((point_dump).geom),
          ST_Y((point_dump).geom)
        )
        ORDER BY (point_dump).path[1]
      )
      FROM ST_DumpPoints(ST_ExteriorRing(polygon_geom)) AS point_dump
    ) AS vertices_json
  FROM dumped
  ORDER BY zone_id, polygon_index
) TO '$TMP_DIR/zone_polygons.csv' WITH CSV HEADER"

psql -h "$DB_HOST" -U "$DB_USER" -d "$SOURCE_DB" -c "\\copy (
  SELECT
    id,
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
    raw_source::text,
    ingested_at
  FROM flight_points
  ORDER BY observed_at, id
) TO '$TMP_DIR/flight_points.csv' WITH CSV HEADER"

echo "Importing benchmark data into plain PostgreSQL database: $TARGET_DB"
psql -h "$DB_HOST" -U "$DB_USER" -d "$TARGET_DB" -c "\\copy flights FROM '$TMP_DIR/flights.csv' WITH CSV HEADER"
psql -h "$DB_HOST" -U "$DB_USER" -d "$TARGET_DB" -c "\\copy benchmark_zone_polygons FROM '$TMP_DIR/zone_polygons.csv' WITH CSV HEADER"
psql -h "$DB_HOST" -U "$DB_USER" -d "$TARGET_DB" -c "\\copy flight_points FROM '$TMP_DIR/flight_points.csv' WITH CSV HEADER"
psql -h "$DB_HOST" -U "$DB_USER" -d "$TARGET_DB" -c "ANALYZE flights; ANALYZE benchmark_zone_polygons; ANALYZE flight_points;"

echo "Plain PostgreSQL benchmark database is ready."
echo "Source DB : $SOURCE_DB"
echo "Target DB : $TARGET_DB"
