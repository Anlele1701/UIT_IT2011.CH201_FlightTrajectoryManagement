import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateIngestionSchema1774519000000 implements MigrationInterface {
    name = "CreateIngestionSchema1774519000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb`);

        await queryRunner.query(`
            CREATE TABLE "airlines"
            (
                "id"         BIGSERIAL    NOT NULL,
                "iata_code"  varchar(3),
                "icao_code"  varchar(4),
                "name"       varchar(120) NOT NULL,
                "country"    varchar(80),
                "callsign"   varchar(80),
                "is_active"  boolean      NOT NULL DEFAULT true,
                "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_airlines_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_airlines_iata_code" UNIQUE ("iata_code"),
                CONSTRAINT "UQ_airlines_icao_code" UNIQUE ("icao_code")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "airports"
            (
                "id"           BIGSERIAL        NOT NULL,
                "iata_code"    varchar(3),
                "icao_code"    varchar(4),
                "name"         varchar(150)     NOT NULL,
                "city"         varchar(100),
                "country"      varchar(80)      NOT NULL,
                "airport_type" varchar(20)      NOT NULL DEFAULT 'domestic',
                "latitude"     double precision NOT NULL,
                "longitude"    double precision NOT NULL,
                "elevation_ft" integer,
                "timezone"     varchar(50),
                "created_at"   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_airports_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_airports_iata_code" UNIQUE ("iata_code"),
                CONSTRAINT "UQ_airports_icao_code" UNIQUE ("icao_code")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "aircraft_models"
            (
                "id"                       BIGSERIAL    NOT NULL,
                "icao_type_code"           varchar(8)   NOT NULL,
                "manufacturer"             varchar(80)  NOT NULL,
                "model_name"               varchar(120) NOT NULL,
                "engine_type"              varchar(40),
                "wake_turbulence_category" varchar(20),
                "typical_seat_capacity"    integer,
                "max_range_km"             integer,
                "cruise_speed_kmh"         integer,
                "created_at"               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_aircraft_models_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_aircraft_models_icao_type_code" UNIQUE ("icao_type_code")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "aircraft"
            (
                "id"                BIGSERIAL   NOT NULL,
                "airline_id"        bigint      NOT NULL,
                "aircraft_model_id" bigint      NOT NULL,
                "registration"      varchar(20) NOT NULL,
                "icao24"            varchar(10),
                "serial_number"     varchar(50),
                "manufacture_year"  integer,
                "status"            varchar(30) NOT NULL DEFAULT 'active',
                "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_aircraft_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_aircraft_registration" UNIQUE ("registration"),
                CONSTRAINT "UQ_aircraft_icao24" UNIQUE ("icao24"),
                CONSTRAINT "FK_aircraft_airline_id" FOREIGN KEY ("airline_id") REFERENCES "airlines" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_aircraft_aircraft_model_id" FOREIGN KEY ("aircraft_model_id") REFERENCES "aircraft_models" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "routes"
            (
                "id"                     BIGSERIAL   NOT NULL,
                "airline_id"             bigint,
                "route_code"             varchar(20),
                "origin_airport_id"      bigint      NOT NULL,
                "destination_airport_id" bigint      NOT NULL,
                "distance_km"            double precision,
                "typical_duration_min"   integer,
                "is_active"              boolean     NOT NULL DEFAULT true,
                "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_routes_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_routes_route_code" UNIQUE ("route_code"),
                CONSTRAINT "FK_routes_airline_id" FOREIGN KEY ("airline_id") REFERENCES "airlines" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_routes_origin_airport_id" FOREIGN KEY ("origin_airport_id") REFERENCES "airports" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_routes_destination_airport_id" FOREIGN KEY ("destination_airport_id") REFERENCES "airports" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "flights"
            (
                "id"                     BIGSERIAL   NOT NULL,
                "airline_id"             bigint,
                "aircraft_id"            bigint,
                "route_id"               bigint,
                "flight_number"          varchar(20),
                "flight_key"             varchar(64) NOT NULL,
                "origin_airport_id"      bigint,
                "destination_airport_id" bigint,
                "icao24"                 varchar(10) NOT NULL,
                "callsign"               varchar(20),
                "origin_country"         varchar(80),
                "source"                 varchar(30) NOT NULL DEFAULT 'opensky',
                "scheduled_departure_at" TIMESTAMPTZ,
                "estimated_departure_at" TIMESTAMPTZ,
                "actual_departure_at"    TIMESTAMPTZ,
                "scheduled_arrival_at"   TIMESTAMPTZ,
                "estimated_arrival_at"   TIMESTAMPTZ,
                "actual_arrival_at"      TIMESTAMPTZ,
                "status"                 varchar(20) NOT NULL DEFAULT 'scheduled',
                "flight_date"            date,
                "first_seen_at"          TIMESTAMPTZ NOT NULL,
                "last_seen_at"           TIMESTAMPTZ NOT NULL,
                "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_flights_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_flights_flight_key" UNIQUE ("flight_key"),
                CONSTRAINT "UQ_flights_flight_number_date" UNIQUE ("flight_number", "flight_date"),
                CONSTRAINT "FK_flights_airline_id" FOREIGN KEY ("airline_id") REFERENCES "airlines" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_flights_aircraft_id" FOREIGN KEY ("aircraft_id") REFERENCES "aircraft" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_flights_route_id" FOREIGN KEY ("route_id") REFERENCES "routes" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_flights_origin_airport_id" FOREIGN KEY ("origin_airport_id") REFERENCES "airports" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_flights_destination_airport_id" FOREIGN KEY ("destination_airport_id") REFERENCES "airports" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "airspace_zones"
            (
                "id"             BIGSERIAL    NOT NULL,
                "zone_code"      varchar(30)  NOT NULL,
                "name"           varchar(120) NOT NULL,
                "zone_type"      varchar(30)  NOT NULL,
                "min_altitude_m" double precision,
                "max_altitude_m" double precision,
                "polygon_geom"   geometry(MultiPolygon, 4326) NOT NULL,
                "is_active"      boolean      NOT NULL DEFAULT true,
                "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_airspace_zones_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_airspace_zones_zone_code" UNIQUE ("zone_code")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "flight_points"
            (
                "id"               BIGSERIAL        NOT NULL,
                "aircraft_id"      bigint,
                "flight_id"        bigint,
                "observed_at"      TIMESTAMPTZ      NOT NULL,
                "icao24"           varchar(10)      NOT NULL,
                "callsign"         varchar(20),
                "latitude"         double precision NOT NULL,
                "longitude"        double precision NOT NULL,
                "altitude_m"       double precision,
                "geo_altitude_m"   double precision,
                "ground_speed_ms"  double precision,
                "heading_deg"      double precision,
                "vertical_rate_ms" double precision,
                "on_ground"        boolean          NOT NULL DEFAULT false,
                "source"           varchar(30)      NOT NULL DEFAULT 'opensky',
                "geom"             geometry(Point, 4326) NOT NULL,
                "geom_3d"          geometry(PointZ, 4326),
                "raw_source"       jsonb,
                "ingested_at"      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_flight_points_id_observed_at" PRIMARY KEY ("id", "observed_at"),
                CONSTRAINT "FK_flight_points_aircraft_id" FOREIGN KEY ("aircraft_id") REFERENCES "aircraft" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_flight_points_flight_id" FOREIGN KEY ("flight_id") REFERENCES "flights" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "UQ_flight_points_snapshot" UNIQUE ("icao24", "observed_at", "longitude", "latitude")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "flight_events"
            (
                "id"              BIGSERIAL   NOT NULL,
                "aircraft_id"     bigint,
                "flight_id"       bigint,
                "flight_point_id" bigint,
                "zone_id"         bigint,
                "event_type"      varchar(40) NOT NULL,
                "event_time"      TIMESTAMPTZ NOT NULL,
                "severity"        smallint    NOT NULL DEFAULT 1,
                "description"     text,
                "metadata"        jsonb,
                "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_flight_events_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_flight_events_aircraft_id" FOREIGN KEY ("aircraft_id") REFERENCES "aircraft" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_flight_events_flight_id" FOREIGN KEY ("flight_id") REFERENCES "flights" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_flight_events_zone_id" FOREIGN KEY ("zone_id") REFERENCES "airspace_zones" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
      SELECT create_hypertable(
        'flight_points',
        'observed_at',
        if_not_exists => TRUE,
        migrate_data => FALSE
      )
    `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flights_airline_date"
                ON "flights" ("airline_id", "flight_date")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flights_status_date"
                ON "flights" ("status", "flight_date")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_points_observed_at"
                ON "flight_points" ("observed_at" DESC)
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_points_icao24_observed_at"
                ON "flight_points" ("icao24", "observed_at" DESC)
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_points_flight_id_observed_at"
                ON "flight_points" ("flight_id", "observed_at" DESC)
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_points_id"
                ON "flight_points" ("id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_points_geom"
                ON "flight_points" USING GIST ("geom")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_points_geom_3d"
                ON "flight_points" USING GIST ("geom_3d")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_airspace_zones_polygon_geom"
                ON "airspace_zones" USING GIST ("polygon_geom")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_events_type_time"
                ON "flight_events" ("event_type", "event_time" DESC)
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_flight_events_flight_time"
                ON "flight_events" ("flight_id", "event_time" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "flight_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "flight_points"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "airspace_zones"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "flights"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "routes"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "aircraft"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "aircraft_models"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "airports"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "airlines"`);
    }
}
