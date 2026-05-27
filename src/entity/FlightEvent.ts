import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "flight_events" })
@Index("IDX_FLIGHT_EVENTS_TYPE_TIME", ["eventType", "eventTime"])
@Index("IDX_FLIGHT_EVENTS_FLIGHT_TIME", ["flightId", "eventTime"])
export class FlightEvent {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  @Column({ name: "aircraft_id", type: "bigint", nullable: true })
  aircraftId!: string | null;

  @Column({ name: "flight_id", type: "bigint", nullable: true })
  flightId!: string | null;

  @Column({ name: "flight_point_id", type: "bigint", nullable: true })
  flightPointId!: string | null;

  @Column({ name: "zone_id", type: "bigint", nullable: true })
  zoneId!: string | null;

  @Column({ name: "event_type", type: "varchar", length: 40 })
  eventType!: string;

  @Column({ name: "event_time", type: "timestamptz" })
  eventTime!: Date;

  @Column({ name: "severity", type: "smallint", default: 1 })
  severity!: number;

  @Column({ name: "description", type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
