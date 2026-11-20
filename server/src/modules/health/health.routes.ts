import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});
