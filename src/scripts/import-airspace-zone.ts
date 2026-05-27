import "reflect-metadata";

import fs from "node:fs/promises";
import path from "node:path";

import { AppDataSource } from "../config/data-source";

type GeoJsonGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

type GeoJsonFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry: GeoJsonGeometry | null;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type ImportOptions = {
  file: string;
  zoneCode: string;
  name: string;
  zoneType: string;
  minAltitudeM: number | null;
  maxAltitudeM: number | null;
  isActive: boolean;
};

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.toLowerCase() === "null") {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return parsed;
}

function requireArg(flag: string): string {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}

function parseOptions(): ImportOptions {
  return {
    file: requireArg("--file"),
    zoneCode: requireArg("--zone-code"),
    name: getArg("--name") ?? requireArg("--zone-code"),
    zoneType: getArg("--zone-type") ?? "restricted",
    minAltitudeM: parseNumber(getArg("--min-altitude-m")),
    maxAltitudeM: parseNumber(getArg("--max-altitude-m")),
    isActive: parseBoolean(getArg("--is-active"), true),
  };
}

function extractGeometry(payload: GeoJsonFeatureCollection | GeoJsonFeature | GeoJsonGeometry): GeoJsonGeometry {
  if ("type" in payload && (payload.type === "Polygon" || payload.type === "MultiPolygon")) {
    return payload;
  }

  if (payload.type === "Feature") {
    if (!payload.geometry) {
      throw new Error("GeoJSON feature does not contain geometry");
    }

    return extractGeometry(payload.geometry);
  }

  if (payload.type === "FeatureCollection") {
    if (payload.features.length === 0) {
      throw new Error("GeoJSON feature collection is empty");
    }

    return extractGeometry(payload.features[0]);
  }

  throw new Error(`Unsupported GeoJSON type: ${(payload as { type?: string }).type ?? "unknown"}`);
}

async function importAirspaceZone() {
  const options = parseOptions();
  const filePath = path.resolve(options.file);
  const raw = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(raw) as GeoJsonFeatureCollection | GeoJsonFeature | GeoJsonGeometry;
  const geometry = extractGeometry(payload);

  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }

  await AppDataSource.initialize();

  await AppDataSource.query(
    `
      INSERT INTO airspace_zones (
        zone_code,
        name,
        zone_type,
        min_altitude_m,
        max_altitude_m,
        polygon_geom,
        is_active
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($6), 4326)),
        $7
      )
      ON CONFLICT (zone_code)
      DO UPDATE SET
        name = EXCLUDED.name,
        zone_type = EXCLUDED.zone_type,
        min_altitude_m = EXCLUDED.min_altitude_m,
        max_altitude_m = EXCLUDED.max_altitude_m,
        polygon_geom = EXCLUDED.polygon_geom,
        is_active = EXCLUDED.is_active
    `,
    [
      options.zoneCode,
      options.name,
      options.zoneType,
      options.minAltitudeM,
      options.maxAltitudeM,
      JSON.stringify(geometry),
      options.isActive,
    ],
  );

  console.log("Airspace zone imported", {
    file: filePath,
    zoneCode: options.zoneCode,
    name: options.name,
    zoneType: options.zoneType,
    geometryType: geometry.type,
  });
}

importAirspaceZone()
  .catch((error) => {
    console.error("Airspace zone import failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
