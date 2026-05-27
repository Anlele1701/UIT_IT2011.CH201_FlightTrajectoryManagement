import { Router } from "express";

import { AppDataSource } from "../config/data-source";
import { FlightEvent } from "../entity/FlightEvent";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const repository = AppDataSource.getRepository(FlightEvent);
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const events = await repository.find({
      order: {
        eventTime: "DESC",
      },
      take: Number.isNaN(limit) ? 100 : limit,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
