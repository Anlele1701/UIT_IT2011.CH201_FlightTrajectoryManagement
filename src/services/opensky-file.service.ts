import fs from "node:fs/promises";
import path from "node:path";

import { NormalizedOpenSkyState, OpenSkyState } from "../types/opensky";
import { normalizeObjectState, normalizeTupleState } from "./opensky-normalizer";

type JsonSnapshotPayload = {
  time?: number;
  states?: OpenSkyState[];
};

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function toRecord(headers: string[], values: string[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  headers.forEach((header, index) => {
    record[header] = values[index] ?? "";
  });

  return record;
}

export class OpenSkyFileService {
  async readStatesFromFile(file: string): Promise<NormalizedOpenSkyState[]> {
    const resolvedPath = path.resolve(file);
    const raw = await fs.readFile(resolvedPath, "utf8");
    const lowerPath = resolvedPath.toLowerCase();

    if (lowerPath.endsWith(".json")) {
      return this.readStatesFromJson(raw);
    }

    if (lowerPath.endsWith(".csv")) {
      return this.readStatesFromCsv(raw);
    }

    throw new Error("Unsupported file format. Use .json or .csv");
  }

  private readStatesFromJson(raw: string): NormalizedOpenSkyState[] {
    const payload = JSON.parse(raw) as JsonSnapshotPayload | Record<string, unknown>[] | Record<string, unknown>;

    if (!Array.isArray(payload) && Array.isArray(payload.states)) {
      const snapshotTime = typeof payload.time === "number" ? payload.time : Math.floor(Date.now() / 1000);
      return payload.states
        .map((state) => normalizeTupleState(snapshotTime, state))
        .filter((state): state is NormalizedOpenSkyState => state !== null);
    }

    const rows = Array.isArray(payload) ? payload : [payload];
    return rows
      .map((row) => normalizeObjectState(row))
      .filter((state): state is NormalizedOpenSkyState => state !== null);
  }

  private readStatesFromCsv(raw: string): NormalizedOpenSkyState[] {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return [];
    }

    const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase());

    return lines
      .slice(1)
      .map((line) => toRecord(headers, splitCsvLine(line)))
      .map((record) => normalizeObjectState(record))
      .filter((state): state is NormalizedOpenSkyState => state !== null);
  }
}
