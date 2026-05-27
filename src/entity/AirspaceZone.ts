import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

type GeometryPolygon = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

@Entity({ name: "airspace_zones" })
@Index("UQ_AIRSPACE_ZONES_ZONE_CODE", ["zoneCode"], { unique: true })
export class AirspaceZone {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "zone_code", type: "varchar", length: 30 })
  zoneCode!: string;

  @Column({ name: "name", type: "varchar", length: 120 })
  name!: string;

  @Column({ name: "zone_type", type: "varchar", length: 30 })
  zoneType!: string;

  @Column({ name: "min_altitude_m", type: "double precision", nullable: true })
  minAltitudeM!: number | null;

  @Column({ name: "max_altitude_m", type: "double precision", nullable: true })
  maxAltitudeM!: number | null;

  @Column({
    name: "polygon_geom",
    type: "geometry",
    spatialFeatureType: "MultiPolygon",
    srid: 4326,
  })
  polygonGeom!: GeometryPolygon;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
