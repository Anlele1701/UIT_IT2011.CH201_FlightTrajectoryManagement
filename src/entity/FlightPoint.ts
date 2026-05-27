import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

type GeometryPoint = {
  type: "Point";
  coordinates: [number, number];
};

type GeometryPointZ = {
  type: "Point";
  coordinates: [number, number, number];
};

@Entity({ name: "flight_points" })
@Index("IDX_FLIGHT_POINTS_ICAO24_OBSERVED_AT", ["icao24", "observedAt"])
@Index("IDX_FLIGHT_POINTS_FLIGHT_ID_OBSERVED_AT", ["flightId", "observedAt"])
@Index("UQ_FLIGHT_POINTS_SNAPSHOT", ["icao24", "observedAt", "longitude", "latitude"], {
  unique: true,
})
export class FlightPoint {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "aircraft_id", type: "bigint", nullable: true })
  aircraftId!: string | null;

  @Column({ name: "flight_id", type: "bigint", nullable: true })
  flightId!: string | null;

  @Column({ name: "observed_at", type: "timestamptz" })
  observedAt!: Date;

  @Column({ name: "icao24", type: "varchar", length: 10 })
  icao24!: string;

  @Column({ name: "callsign", type: "varchar", length: 20, nullable: true })
  callsign!: string | null;

  @Column({ name: "latitude", type: "double precision" })
  latitude!: number;

  @Column({ name: "longitude", type: "double precision" })
  longitude!: number;

  @Column({ name: "altitude_m", type: "double precision", nullable: true })
  altitudeM!: number | null;

  @Column({ name: "geo_altitude_m", type: "double precision", nullable: true })
  geoAltitudeM!: number | null;

  @Column({ name: "ground_speed_ms", type: "double precision", nullable: true })
  groundSpeedMs!: number | null;

  @Column({ name: "heading_deg", type: "double precision", nullable: true })
  headingDeg!: number | null;

  @Column({ name: "vertical_rate_ms", type: "double precision", nullable: true })
  verticalRateMs!: number | null;

  @Column({ name: "on_ground", type: "boolean", default: false })
  onGround!: boolean;

  @Column({ name: "source", type: "varchar", length: 30, default: "opensky" })
  source!: string;

  @Column({
    name: "geom",
    type: "geometry",
    spatialFeatureType: "Point",
    srid: 4326,
  })
  geom!: GeometryPoint;

  @Column({
    name: "geom_3d",
    type: "geometry",
    spatialFeatureType: "PointZ",
    srid: 4326,
    nullable: true,
  })
  geom3d!: GeometryPointZ | null;

  @Column({ name: "raw_source", type: "jsonb", nullable: true })
  rawSource!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "ingested_at", type: "timestamptz" })
  ingestedAt!: Date;
}
