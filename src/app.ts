import express, { NextFunction, Request, Response } from "express";

import flightEventRoutes from "./routes/flight-event.routes";
import flightPointRoutes from "./routes/flight-point.routes";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/flight-points", flightPointRoutes);
  app.use("/api/flight-events", flightEventRoutes);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ message });
  });

  return app;
}
