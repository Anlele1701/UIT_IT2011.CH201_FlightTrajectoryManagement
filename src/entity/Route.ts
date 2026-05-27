import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "routes" })
@Index("UQ_ROUTES_ROUTE_CODE", ["routeCode"], { unique: true })
export class Route {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "airline_id", type: "bigint", nullable: true })
  airlineId!: string | null;

  @Column({ name: "route_code", type: "varchar", length: 20, nullable: true })
  routeCode!: string | null;

  @Column({ name: "origin_airport_id", type: "bigint" })
  originAirportId!: string;

  @Column({ name: "destination_airport_id", type: "bigint" })
  destinationAirportId!: string;

  @Column({ name: "distance_km", type: "double precision", nullable: true })
  distanceKm!: number | null;

  @Column({ name: "typical_duration_min", type: "integer", nullable: true })
  typicalDurationMin!: number | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
