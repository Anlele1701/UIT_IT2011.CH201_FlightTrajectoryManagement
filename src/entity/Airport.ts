import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "airports" })
@Index("UQ_AIRPORTS_IATA_CODE", ["iataCode"], { unique: true })
@Index("UQ_AIRPORTS_ICAO_CODE", ["icaoCode"], { unique: true })
export class Airport {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "iata_code", type: "varchar", length: 3, nullable: true })
  iataCode!: string | null;

  @Column({ name: "icao_code", type: "varchar", length: 4, nullable: true })
  icaoCode!: string | null;

  @Column({ name: "name", type: "varchar", length: 150 })
  name!: string;

  @Column({ name: "city", type: "varchar", length: 100, nullable: true })
  city!: string | null;

  @Column({ name: "country", type: "varchar", length: 80 })
  country!: string;

  @Column({ name: "airport_type", type: "varchar", length: 20, default: "domestic" })
  airportType!: string;

  @Column({ name: "latitude", type: "double precision" })
  latitude!: number;

  @Column({ name: "longitude", type: "double precision" })
  longitude!: number;

  @Column({ name: "elevation_ft", type: "integer", nullable: true })
  elevationFt!: number | null;

  @Column({ name: "timezone", type: "varchar", length: 50, nullable: true })
  timezone!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
