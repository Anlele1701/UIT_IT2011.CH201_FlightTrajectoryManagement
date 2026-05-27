import "reflect-metadata";
import path from "node:path";
import { DataSource } from "typeorm";

import { env } from "./env";
import { Aircraft } from "../entity/Aircraft";
import { AircraftModel } from "../entity/AircraftModel";
import { AirspaceZone } from "../entity/AirspaceZone";
import { Airline } from "../entity/Airline";
import { Airport } from "../entity/Airport";
import { Flight } from "../entity/Flight";
import { FlightEvent } from "../entity/FlightEvent";
import { FlightPoint } from "../entity/FlightPoint";
import { Route } from "../entity/Route";

const isTsRuntime = __filename.endsWith(".ts");
const migrationExtension = isTsRuntime ? "ts" : "js";
const migrationsPath = path.join(__dirname, "..", "migrations", `*.${migrationExtension}`);

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  schema: env.dbSchema,
  entities: [Airline, Airport, AircraftModel, Aircraft, Route, Flight, AirspaceZone, FlightPoint, FlightEvent],
  migrations: [migrationsPath],
  synchronize: false,
  logging: false,
});
