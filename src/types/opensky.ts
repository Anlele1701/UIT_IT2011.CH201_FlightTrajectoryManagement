export type OpenSkyState = [
  string,
  string | null,
  string | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  boolean,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  string | null,
  boolean | null,
  number | null
];

export type OpenSkyStatesResponse = {
  time: number;
  states: OpenSkyState[] | null;
};

export type NormalizedOpenSkyState = {
  source: "opensky";
  sourceSnapshotTime: number;
  icao24: string;
  callsign: string | null;
  originCountry: string | null;
  observedAt: Date;
  longitude: number;
  latitude: number;
  altitudeM: number | null;
  geoAltitudeM: number | null;
  groundSpeedMs: number | null;
  headingDeg: number | null;
  verticalRateMs: number | null;
  onGround: boolean;
  rawSource: Record<string, unknown>;
};

export type BoundingBox = {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
};
