import cors from "cors";
import express from "express";
import { config } from "./config";
import orderRoutes from "./routes/orderRoutes";

const app = express();

const origins = config.corsOrigins.split(",").map((o) => o.trim());
const allowAll = origins.includes("*");

app.use(
  cors({
    origin: allowAll ? true : origins,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    service: "order-service",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use(orderRoutes);

export default app;
