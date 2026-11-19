import { Router } from "express";
import mongoose from "mongoose";

const DB_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export const healthRouter = Router();

// GET /api/v1/health
healthRouter.get("/", (_req, res) => {
  const database = DB_STATES[mongoose.connection.readyState] ?? "unknown";
  const healthy = database === "connected";

  res.status(healthy ? 200 : 503).json({
    data: {
      status: healthy ? "ok" : "degraded",
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});
