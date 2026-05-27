import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "aircraft" })
@Index("UQ_AIRCRAFT_REGISTRATION", ["registration"], { unique: true })
@Index("UQ_AIRCRAFT_ICAO24", ["icao24"], { unique: true })
export class Aircraft {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "airline_id", type: "bigint" })
  airlineId!: string;

  @Column({ name: "aircraft_model_id", type: "bigint" })
  aircraftModelId!: string;

  @Column({ name: "registration", type: "varchar", length: 20 })
  registration!: string;

  @Column({ name: "icao24", type: "varchar", length: 10, nullable: true })
  icao24!: string | null;

  @Column({ name: "serial_number", type: "varchar", length: 50, nullable: true })
  serialNumber!: string | null;

  @Column({ name: "manufacture_year", type: "integer", nullable: true })
  manufactureYear!: number | null;

  @Column({ name: "status", type: "varchar", length: 30, default: "active" })
  status!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
