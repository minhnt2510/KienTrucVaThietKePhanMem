import express, { Application } from "express";
import cors from "cors";
import { config } from "./config";
import bookingRoutes from "./routes/bookingRoutes";

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "booking-service" });
  });

  // Routes
  app.use("/bookings", bookingRoutes);

  return app;
}
