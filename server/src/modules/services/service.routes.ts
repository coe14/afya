import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateBody } from "../../middleware/validate";
import { addService, getServices } from "./service.controller";
import { createServiceSchema } from "./service.schema";

export const serviceRouter = Router();

// GET /api/v1/services  (public)
serviceRouter.get("/", getServices);

// POST /api/v1/services  (admin only)
serviceRouter.post(
  "/",
  authenticate,
  authorize("admin"),
  validateBody(createServiceSchema),
  addService,
);
