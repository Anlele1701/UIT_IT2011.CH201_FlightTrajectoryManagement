import { NormalizedOpenSkyState, OpenSkyState } from "../types/opensky";

type OpenSkyObjectRecord = Record<string, unknown>;

function trimToNull(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true" || value.trim() === "1";
  }

  return false;
}

function readString(record: OpenSkyObjectRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return trimToNull(value);
    }
  }

  return null;
}

function readNumber(record: OpenSkyObjectRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

export function normalizeTupleState(snapshotTime: number, state: OpenSkyState): NormalizedOpenSkyState | null {
  const observedUnix = state[3] ?? state[4];
  const longitude = state[5];
  const latitude = state[6];
  const icao24 = trimToNull(state[0]);

  if (!icao24 || observedUnix === null || longitude === null || latitude === null) {
    return null;
  }

  return {
    source: "opensky",
    sourceSnapshotTime: snapshotTime,
    icao24,
    callsign: trimToNull(state[1]),
    originCountry: trimToNull(state[2]),
    observedAt: new Date(observedUnix * 1000),
    longitude,
    latitude,
    altitudeM: state[13] ?? state[7],
    geoAltitudeM: state[13],
    groundSpeedMs: state[9],
    headingDeg: state[10],
    verticalRateMs: state[11],
    onGround: state[8],
    rawSource: {
      sourceSnapshotTime: snapshotTime,
      state,
    },
  };
}

export function normalizeObjectState(record: OpenSkyObjectRecord): NormalizedOpenSkyState | null {
  const observedUnix =
    readNumber(record, ["time", "timestamp", "time_position", "last_contact", "mintime", "seen"]) ??
    Math.floor(Date.now() / 1000);
  const longitude = readNumber(record, ["lon", "longitude"]);
  const latitude = readNumber(record, ["lat", "latitude"]);
  const icao24 = readString(record, ["icao24"]);

  if (!icao24 || longitude === null || latitude === null) {
    return null;
  }

  const altitudeM = readNumber(record, ["geoaltitude", "geo_altitude", "geo_altitude_m", "baroaltitude", "baro_altitude", "altitude_m"]);
  const geoAltitudeM = readNumber(record, ["geoaltitude", "geo_altitude", "geo_altitude_m"]);

  return {
    source: "opensky",
    sourceSnapshotTime: observedUnix,
    icao24,
    callsign: readString(record, ["callsign"]),
    originCountry: readString(record, ["origin_country", "origincountry", "country"]),
    observedAt: new Date(observedUnix * 1000),
    longitude,
    latitude,
    altitudeM,
    geoAltitudeM,
    groundSpeedMs: readNumber(record, ["velocity", "ground_speed_ms", "groundspeed", "speed"]),
    headingDeg: readNumber(record, ["heading", "true_track", "track"]),
    verticalRateMs: readNumber(record, ["vertrate", "vertical_rate", "vertical_rate_ms"]),
    onGround: toBoolean(record.onground ?? record.on_ground),
    rawSource: record,
  };
}
