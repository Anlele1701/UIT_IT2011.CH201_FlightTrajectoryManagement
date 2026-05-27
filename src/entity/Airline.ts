import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "airlines" })
@Index("UQ_AIRLINES_IATA_CODE", ["iataCode"], { unique: true })
@Index("UQ_AIRLINES_ICAO_CODE", ["icaoCode"], { unique: true })
export class Airline {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "iata_code", type: "varchar", length: 3, nullable: true })
  iataCode!: string | null;

  @Column({ name: "icao_code", type: "varchar", length: 4, nullable: true })
  icaoCode!: string | null;

  @Column({ name: "name", type: "varchar", length: 120 })
  name!: string;

  @Column({ name: "country", type: "varchar", length: 80, nullable: true })
  country!: string | null;

  @Column({ name: "callsign", type: "varchar", length: 80, nullable: true })
  callsign!: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
