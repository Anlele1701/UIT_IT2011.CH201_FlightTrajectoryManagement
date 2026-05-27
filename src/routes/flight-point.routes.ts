import { Router } from "express";

import { AppDataSource } from "../config/data-source";
import { FlightPoint } from "../entity/FlightPoint";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const repository = AppDataSource.getRepository(FlightPoint);
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const icao24 = typeof req.query.icao24 === "string" ? req.query.icao24.trim() : undefined;

    const query = repository
      .createQueryBuilder("point")
      .orderBy("point.observedAt", "DESC")
      .limit(Number.isNaN(limit) ? 100 : limit);

    if (icao24) {
      query.where("point.icao24 = :icao24", { icao24 });
    }

    const points = await query.getMany();

    res.json({
      type: "FeatureCollection",
      features: points.map((point) => ({
        type: "Feature",
        geometry: point.geom,
        properties: {
          id: point.id,
          flightId: point.flightId,
          observedAt: point.observedAt,
          icao24: point.icao24,
          callsign: point.callsign,
          altitudeM: point.altitudeM,
          geoAltitudeM: point.geoAltitudeM,
          groundSpeedMs: point.groundSpeedMs,
          headingDeg: point.headingDeg,
          verticalRateMs: point.verticalRateMs,
          onGround: point.onGround,
          source: point.source,
          ingestedAt: point.ingestedAt,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
