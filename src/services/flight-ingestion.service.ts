import { Repository } from "typeorm";

import { AppDataSource } from "../config/data-source";
import { Aircraft } from "../entity/Aircraft";
import { AirspaceZone } from "../entity/AirspaceZone";
import { Airline } from "../entity/Airline";
import { Flight } from "../entity/Flight";
import { FlightEvent } from "../entity/FlightEvent";
import { FlightPoint } from "../entity/FlightPoint";
import { NormalizedOpenSkyState } from "../types/opensky";

type EventCandidate = {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
};

export type IngestionSummary = {
  fetched: number;
  storedPoints: number;
  ignoredPoints: number;
  createdEvents: number;
  trackedFlights: number;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "driverError" in error &&
    typeof (error as { driverError?: { code?: string } }).driverError?.code === "string" &&
    (error as { driverError?: { code?: string } }).driverError?.code === "23505"
  );
}

function createFlightKey(state: NormalizedOpenSkyState): string {
  return `${state.icao24}:${state.callsign ?? "UNKNOWN"}`;
}

function normalizeCallsign(callsign: string | null): string | null {
  if (!callsign) {
    return null;
  }

  const trimmed = callsign.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

function extractAirlineCode(callsign: string | null): string | null {
  const normalized = normalizeCallsign(callsign);
  return normalized && normalized.length >= 3 ? normalized.slice(0, 3) : null;
}

function extractFlightNumber(callsign: string | null): string | null {
  return normalizeCallsign(callsign);
}

export class FlightIngestionService {
  constructor(
    private readonly airlineRepository: Repository<Airline> = AppDataSource.getRepository(Airline),
    private readonly aircraftRepository: Repository<Aircraft> = AppDataSource.getRepository(Aircraft),
    private readonly flightRepository: Repository<Flight> = AppDataSource.getRepository(Flight),
    private readonly flightPointRepository: Repository<FlightPoint> = AppDataSource.getRepository(FlightPoint),
    private readonly flightEventRepository: Repository<FlightEvent> = AppDataSource.getRepository(FlightEvent),
    private readonly airspaceZoneRepository: Repository<AirspaceZone> = AppDataSource.getRepository(AirspaceZone),
  ) {}

  async ingestStates(states: NormalizedOpenSkyState[]): Promise<IngestionSummary> {
    const zones = await this.airspaceZoneRepository.findBy({ isActive: true });

    let storedPoints = 0;
    let ignoredPoints = 0;
    let createdEvents = 0;
    const trackedFlights = new Set<string>();

    for (const state of states) {
      const relatedData = await this.findRelatedData(state);
      const flight = await this.upsertFlight(state, relatedData);
      trackedFlights.add(flight.id);

      const existingPoint = await this.flightPointRepository.findOne({
        where: {
          icao24: state.icao24,
          observedAt: state.observedAt,
          longitude: state.longitude,
          latitude: state.latitude,
        },
        select: {
          id: true,
          flightId: true,
          observedAt: true,
          icao24: true,
          callsign: true,
          latitude: true,
          longitude: true,
          altitudeM: true,
          geoAltitudeM: true,
          groundSpeedMs: true,
          headingDeg: true,
          verticalRateMs: true,
          onGround: true,
          source: true,
          geom: true,
          geom3d: true,
          rawSource: true,
          ingestedAt: true,
        },
      });

      if (existingPoint) {
        ignoredPoints += 1;
        continue;
      }

      const point = this.flightPointRepository.create({
        aircraftId: relatedData.aircraft?.id ?? null,
        flightId: flight.id,
        observedAt: state.observedAt,
        icao24: state.icao24,
        callsign: normalizeCallsign(state.callsign),
        latitude: state.latitude,
        longitude: state.longitude,
        altitudeM: state.altitudeM,
        geoAltitudeM: state.geoAltitudeM,
        groundSpeedMs: state.groundSpeedMs,
        headingDeg: state.headingDeg,
        verticalRateMs: state.verticalRateMs,
        onGround: state.onGround,
        source: state.source,
        geom: {
          type: "Point",
          coordinates: [state.longitude, state.latitude],
        },
        geom3d:
          state.altitudeM === null
            ? null
            : {
                type: "Point",
                coordinates: [state.longitude, state.latitude, state.altitudeM],
              },
        rawSource: state.rawSource,
      });

      let savedPoint: FlightPoint;

      try {
        savedPoint = await this.flightPointRepository.save(point);
      } catch (error) {
        if (isUniqueViolation(error)) {
          ignoredPoints += 1;
          continue;
        }

        throw error;
      }

      storedPoints += 1;

      createdEvents += await this.detectZoneEntryEvents(savedPoint, state, zones);
    }

    return {
      fetched: states.length,
      storedPoints,
      ignoredPoints,
      createdEvents,
      trackedFlights: trackedFlights.size,
    };
  }

  private async findRelatedData(state: NormalizedOpenSkyState): Promise<{
    airline: Airline | null;
    aircraft: Aircraft | null;
  }> {
    const airlineCode = extractAirlineCode(state.callsign);

    const [airline, aircraft] = await Promise.all([
      airlineCode ? this.airlineRepository.findOne({ where: { icaoCode: airlineCode } }) : Promise.resolve(null),
      this.aircraftRepository.findOne({ where: { icao24: state.icao24 } }),
    ]);

    return { airline, aircraft };
  }

  private async upsertFlight(
    state: NormalizedOpenSkyState,
    relatedData: { airline: Airline | null; aircraft: Aircraft | null },
  ): Promise<Flight> {
    const normalizedCallsign = normalizeCallsign(state.callsign);
    const flightNumber = extractFlightNumber(state.callsign);
    const flightDate = state.observedAt.toISOString().slice(0, 10);
    const flightKey = createFlightKey(state);
    let flight: Flight | null = null;

    if (flightNumber) {
      flight = await this.flightRepository.findOne({
        where: {
          flightNumber,
          flightDate,
        },
      });
    }

    if (!flight) {
      flight = await this.flightRepository.findOne({ where: { flightKey } });
    }

    if (!flight) {
      flight = this.flightRepository.create({
        airlineId: relatedData.airline?.id ?? relatedData.aircraft?.airlineId ?? null,
        aircraftId: relatedData.aircraft?.id ?? null,
        routeId: null,
        flightNumber,
        flightKey,
        originAirportId: null,
        destinationAirportId: null,
        icao24: state.icao24,
        callsign: normalizedCallsign,
        originCountry: state.originCountry,
        source: state.source,
        scheduledDepartureAt: null,
        estimatedDepartureAt: null,
        actualDepartureAt: null,
        scheduledArrivalAt: null,
        estimatedArrivalAt: null,
        actualArrivalAt: null,
        status: state.onGround ? "boarding" : "enroute",
        flightDate,
        firstSeenAt: state.observedAt,
        lastSeenAt: state.observedAt,
      });
    } else {
      flight.airlineId = flight.airlineId ?? relatedData.airline?.id ?? relatedData.aircraft?.airlineId ?? null;
      flight.aircraftId = flight.aircraftId ?? relatedData.aircraft?.id ?? null;
      flight.flightNumber = flight.flightNumber ?? flightNumber;
      flight.callsign = normalizedCallsign;
      flight.originCountry = state.originCountry;
      flight.status = state.onGround ? "boarding" : "enroute";
      flight.flightDate = flight.flightDate ?? flightDate;
      flight.lastSeenAt = state.observedAt > flight.lastSeenAt ? state.observedAt : flight.lastSeenAt;
    }

    try {
      return await this.flightRepository.save(flight);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const fallbackFlight =
        (flightNumber
          ? await this.flightRepository.findOne({
              where: {
                flightNumber,
                flightDate,
              },
            })
          : null) ??
        (await this.flightRepository.findOne({
          where: { flightKey },
        }));

      if (!fallbackFlight) {
        throw error;
      }

      return fallbackFlight;
    }
  }

  private async detectZoneEntryEvents(
    point: FlightPoint,
    state: NormalizedOpenSkyState,
    zones: AirspaceZone[],
  ): Promise<number> {
    const matchingZones = await this.findMatchingZones(point.id, zones, state.altitudeM);
    if (matchingZones.length === 0) {
      return 0;
    }

    const previousPoint = await this.flightPointRepository
      .createQueryBuilder("point")
      .where("point.flight_id = :flightId", { flightId: point.flightId })
      .andWhere(
        "(point.observed_at < :observedAt OR (point.observed_at = :observedAt AND point.id < :pointId))",
        {
          observedAt: point.observedAt,
          pointId: point.id,
        },
      )
      .orderBy("point.observed_at", "DESC")
      .addOrderBy("point.id", "DESC")
      .limit(1)
      .getOne();

    let created = 0;

    for (const zone of matchingZones) {
      const wasInsideBefore = previousPoint
        ? await this.isPointInsideZone(previousPoint.id, zone.zoneId, previousPoint.altitudeM)
        : false;

      if (wasInsideBefore) {
        continue;
      }

      const existingEvent = await this.flightEventRepository.findOne({
        where: {
          flightId: point.flightId ?? undefined,
          flightPointId: point.id,
          zoneId: zone.zoneId,
          eventType: "geofence_entry",
        },
      });

      if (existingEvent) {
        continue;
      }

      const event = this.flightEventRepository.create({
        aircraftId: point.aircraftId,
        flightId: point.flightId,
        flightPointId: point.id,
        zoneId: zone.zoneId,
        eventType: "geofence_entry",
        eventTime: point.observedAt,
        severity: 3,
        description: `${state.callsign ?? state.icao24} entered ${zone.zoneName}`,
        metadata: {
          zoneCode: zone.zoneCode,
          zoneType: "restricted",
          icao24: state.icao24,
          callsign: state.callsign,
          longitude: state.longitude,
          latitude: state.latitude,
          altitudeM: state.altitudeM,
        },
      });

      await this.flightEventRepository.save(event);
      created += 1;
    }

    return created;
  }

  private async findMatchingZones(
    pointId: string,
    zones: AirspaceZone[],
    altitudeM: number | null,
  ): Promise<EventCandidate[]> {
    const matches: EventCandidate[] = [];

    for (const zone of zones) {
      if (!this.altitudeMatches(zone, altitudeM)) {
        continue;
      }

      const isInside = await this.isPointInsideZone(pointId, zone.id, altitudeM);
      if (!isInside) {
        continue;
      }

      matches.push({
        zoneId: zone.id,
        zoneCode: zone.zoneCode,
        zoneName: zone.name,
      });
    }

    return matches;
  }

  private altitudeMatches(zone: AirspaceZone, altitudeM: number | null): boolean {
    if (altitudeM === null) {
      return zone.minAltitudeM === null && zone.maxAltitudeM === null;
    }

    if (zone.minAltitudeM !== null && altitudeM < zone.minAltitudeM) {
      return false;
    }

    if (zone.maxAltitudeM !== null && altitudeM > zone.maxAltitudeM) {
      return false;
    }

    return true;
  }

  private async isPointInsideZone(
    pointId: string,
    zoneId: string,
    altitudeM: number | null,
  ): Promise<boolean> {
    const result = await this.flightPointRepository.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM flight_points fp
          JOIN airspace_zones az ON az.id = $2
          WHERE fp.id = $1
            AND ST_Intersects(fp.geom, az.polygon_geom)
            AND ($3::double precision IS NULL OR az.min_altitude_m IS NULL OR $3 >= az.min_altitude_m)
            AND ($3::double precision IS NULL OR az.max_altitude_m IS NULL OR $3 <= az.max_altitude_m)
        ) AS is_inside
      `,
      [pointId, zoneId, altitudeM],
    );

    return result[0]?.is_inside === true;
  }
}
