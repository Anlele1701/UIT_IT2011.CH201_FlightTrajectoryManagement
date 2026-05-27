import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "flights" })
@Index("UQ_FLIGHTS_FLIGHT_KEY", ["flightKey"], { unique: true })
@Index("UQ_FLIGHTS_FLIGHT_NUMBER_DATE", ["flightNumber", "flightDate"], { unique: true })
@Index("IDX_FLIGHTS_AIRLINE_DATE", ["airlineId", "flightDate"])
@Index("IDX_FLIGHTS_STATUS_DATE", ["status", "flightDate"])
export class Flight {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "airline_id", type: "bigint", nullable: true })
  airlineId!: string | null;

  @Column({ name: "aircraft_id", type: "bigint", nullable: true })
  aircraftId!: string | null;

  @Column({ name: "route_id", type: "bigint", nullable: true })
  routeId!: string | null;

  @Column({ name: "flight_number", type: "varchar", length: 20, nullable: true })
  flightNumber!: string | null;

  @Column({ name: "flight_key", type: "varchar", length: 64 })
  flightKey!: string;

  @Column({ name: "origin_airport_id", type: "bigint", nullable: true })
  originAirportId!: string | null;

  @Column({ name: "destination_airport_id", type: "bigint", nullable: true })
  destinationAirportId!: string | null;

  @Column({ name: "icao24", type: "varchar", length: 10 })
  icao24!: string;

  @Column({ name: "callsign", type: "varchar", length: 20, nullable: true })
  callsign!: string | null;

  @Column({ name: "origin_country", type: "varchar", length: 80, nullable: true })
  originCountry!: string | null;

  @Column({ name: "source", type: "varchar", length: 30, default: "opensky" })
  source!: string;

  @Column({ name: "scheduled_departure_at", type: "timestamptz", nullable: true })
  scheduledDepartureAt!: Date | null;

  @Column({ name: "estimated_departure_at", type: "timestamptz", nullable: true })
  estimatedDepartureAt!: Date | null;

  @Column({ name: "actual_departure_at", type: "timestamptz", nullable: true })
  actualDepartureAt!: Date | null;

  @Column({ name: "scheduled_arrival_at", type: "timestamptz", nullable: true })
  scheduledArrivalAt!: Date | null;

  @Column({ name: "estimated_arrival_at", type: "timestamptz", nullable: true })
  estimatedArrivalAt!: Date | null;

  @Column({ name: "actual_arrival_at", type: "timestamptz", nullable: true })
  actualArrivalAt!: Date | null;

  @Column({ name: "status", type: "varchar", length: 20, default: "scheduled" })
  status!: string;

  @Column({ name: "flight_date", type: "date", nullable: true })
  flightDate!: string | null;

  @Column({ name: "first_seen_at", type: "timestamptz" })
  firstSeenAt!: Date;

  @Column({ name: "last_seen_at", type: "timestamptz" })
  lastSeenAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
