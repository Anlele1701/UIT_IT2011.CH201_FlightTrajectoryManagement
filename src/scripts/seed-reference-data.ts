import "reflect-metadata";

import { AppDataSource } from "../config/data-source";
import { AIRCRAFT_MODELS, AIRLINES, AIRPORTS, ROUTE_DEFINITIONS } from "../data/reference-data";
import { Aircraft } from "../entity/Aircraft";
import { AircraftModel } from "../entity/AircraftModel";
import { Airline } from "../entity/Airline";
import { Airport } from "../entity/Airport";
import { Route } from "../entity/Route";

type AircraftSeedPlan = {
  airlineIcaoCode: string;
  modelIcaoTypeCode: string;
  registrationPrefix: string;
  count: number;
  yearStart: number;
};

const AIRCRAFT_SEED_PLANS: AircraftSeedPlan[] = [
  { airlineIcaoCode: "DLH", modelIcaoTypeCode: "A321", registrationPrefix: "D-AIS", count: 4, yearStart: 2017 },
  { airlineIcaoCode: "DLH", modelIcaoTypeCode: "A359", registrationPrefix: "D-AIX", count: 3, yearStart: 2019 },
  { airlineIcaoCode: "AFR", modelIcaoTypeCode: "A320", registrationPrefix: "F-GKX", count: 4, yearStart: 2016 },
  { airlineIcaoCode: "KLM", modelIcaoTypeCode: "B738", registrationPrefix: "PH-BG", count: 4, yearStart: 2015 },
  { airlineIcaoCode: "BAW", modelIcaoTypeCode: "A319", registrationPrefix: "G-EUP", count: 4, yearStart: 2014 },
  { airlineIcaoCode: "RYR", modelIcaoTypeCode: "B38M", registrationPrefix: "EI-HA", count: 5, yearStart: 2021 },
  { airlineIcaoCode: "EZY", modelIcaoTypeCode: "A20N", registrationPrefix: "G-UZE", count: 4, yearStart: 2020 },
  { airlineIcaoCode: "SWR", modelIcaoTypeCode: "A320", registrationPrefix: "HB-JL", count: 3, yearStart: 2016 },
  { airlineIcaoCode: "THY", modelIcaoTypeCode: "B789", registrationPrefix: "TC-LL", count: 4, yearStart: 2018 },
];

function makeRegistration(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(2, "0")}`;
}

function makeHexId(seed: number): string {
  return seed.toString(16).toUpperCase().padStart(6, "0");
}

async function seedReferenceData() {
  await AppDataSource.initialize();

  const airlineRepository = AppDataSource.getRepository(Airline);
  const airportRepository = AppDataSource.getRepository(Airport);
  const aircraftModelRepository = AppDataSource.getRepository(AircraftModel);
  const aircraftRepository = AppDataSource.getRepository(Aircraft);
  const routeRepository = AppDataSource.getRepository(Route);

  await airlineRepository.upsert(AIRLINES, ["icaoCode"]);
  await airportRepository.upsert(AIRPORTS, ["icaoCode"]);
  await aircraftModelRepository.upsert(AIRCRAFT_MODELS, ["icaoTypeCode"]);

  const airlines = await airlineRepository.find();
  const airports = await airportRepository.find();
  const aircraftModels = await aircraftModelRepository.find();

  const airlineByIcao = new Map(airlines.filter((item) => item.icaoCode).map((item) => [item.icaoCode as string, item]));
  const airportByIata = new Map(airports.filter((item) => item.iataCode).map((item) => [item.iataCode as string, item]));
  const modelByType = new Map(aircraftModels.map((item) => [item.icaoTypeCode, item]));

  const routes = ROUTE_DEFINITIONS.map((definition) => {
    const airline = airlineByIcao.get(definition.airlineIcaoCode);
    const origin = airportByIata.get(definition.originIataCode);
    const destination = airportByIata.get(definition.destinationIataCode);

    if (!origin || !destination) {
      throw new Error(`Missing airport mapping for route ${definition.routeCode}`);
    }

    return routeRepository.create({
      airlineId: airline?.id ?? null,
      routeCode: definition.routeCode,
      originAirportId: origin.id,
      destinationAirportId: destination.id,
      distanceKm: definition.distanceKm,
      typicalDurationMin: definition.typicalDurationMin,
      isActive: true,
    });
  });

  await routeRepository.upsert(routes, ["routeCode"]);

  const aircraftSeeds: Omit<Aircraft, "id" | "createdAt">[] = [];
  let hexSeed = 0x880001;

  for (const plan of AIRCRAFT_SEED_PLANS) {
    const airline = airlineByIcao.get(plan.airlineIcaoCode);
    const model = modelByType.get(plan.modelIcaoTypeCode);

    if (!airline || !model) {
      throw new Error(`Missing airline/model mapping for ${plan.airlineIcaoCode} ${plan.modelIcaoTypeCode}`);
    }

    for (let index = 1; index <= plan.count; index += 1) {
      aircraftSeeds.push({
        airlineId: airline.id,
        aircraftModelId: model.id,
        registration: makeRegistration(plan.registrationPrefix, index),
        icao24: makeHexId(hexSeed),
        serialNumber: `${plan.modelIcaoTypeCode}-${plan.airlineIcaoCode}-${String(index).padStart(3, "0")}`,
        manufactureYear: plan.yearStart + index - 1,
        status: "active",
      });
      hexSeed += 1;
    }
  }

  await aircraftRepository.upsert(aircraftSeeds, ["icao24"]);

  console.log("Reference data seed completed", {
    airlines: AIRLINES.length,
    airports: AIRPORTS.length,
    aircraftModels: AIRCRAFT_MODELS.length,
    routes: ROUTE_DEFINITIONS.length,
    aircraft: aircraftSeeds.length,
  });
}

seedReferenceData()
  .catch((error) => {
    console.error("Reference data seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
