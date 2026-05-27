import "reflect-metadata";

import { AppDataSource } from "../config/data-source";
import { FlightIngestionService } from "../services/flight-ingestion.service";
import { OpenSkyFileService } from "../services/opensky-file.service";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function requireArg(flag: string): string {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}

function parseLimit(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("--limit must be a positive integer");
  }

  return parsed;
}

async function importOpenSkyStateFile() {
  const file = requireArg("--file");
  const limit = parseLimit(getArg("--limit"));

  const openSkyFileService = new OpenSkyFileService();
  const parsedStates = await openSkyFileService.readStatesFromFile(file);
  const states = limit === null ? parsedStates : parsedStates.slice(0, limit);

  await AppDataSource.initialize();

  const ingestionService = new FlightIngestionService();
  const summary = await ingestionService.ingestStates(states);

  console.log("OpenSky file import completed", {
    file,
    parsed: parsedStates.length,
    imported: states.length,
    summary,
  });
}

importOpenSkyStateFile()
  .catch((error) => {
    console.error("OpenSky file import failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
