import type { RequestHandler } from "express";
import {
  createServiceSchema,
  listServicesQuerySchema,
  type CreateServiceInput,
} from "./service.schema";
import { createService, listServices } from "./service.service";

// GET /api/v1/services
export const getServices: RequestHandler = async (req, res) => {
  // validateBody only covers request bodies, so we parse the query string here.
  // A bad value throws a ZodError, which becomes a 400 response.
  const query = listServicesQuerySchema.parse(req.query);

  const { services, meta } = await listServices(query);

  res.status(200).json({ data: { services }, meta });
};

// POST /api/v1/services  (admin only)
export const addService: RequestHandler = async (req, res) => {
  // validateBody(createServiceSchema) already checked and cleaned this data.
  const input: CreateServiceInput = req.body;

  const service = await createService(input);

  res.status(201).json({ data: { service } });
};
