import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "aircraft_models" })
@Index("UQ_AIRCRAFT_MODELS_ICAO_TYPE_CODE", ["icaoTypeCode"], { unique: true })
export class AircraftModel {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "icao_type_code", type: "varchar", length: 8 })
  icaoTypeCode!: string;

  @Column({ name: "manufacturer", type: "varchar", length: 80 })
  manufacturer!: string;

  @Column({ name: "model_name", type: "varchar", length: 120 })
  modelName!: string;

  @Column({ name: "engine_type", type: "varchar", length: 40, nullable: true })
  engineType!: string | null;

  @Column({ name: "wake_turbulence_category", type: "varchar", length: 20, nullable: true })
  wakeTurbulenceCategory!: string | null;

  @Column({ name: "typical_seat_capacity", type: "integer", nullable: true })
  typicalSeatCapacity!: number | null;

  @Column({ name: "max_range_km", type: "integer", nullable: true })
  maxRangeKm!: number | null;

  @Column({ name: "cruise_speed_kmh", type: "integer", nullable: true })
  cruiseSpeedKmh!: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
