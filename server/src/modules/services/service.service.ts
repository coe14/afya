import { Service, type ServiceDocument } from "../../models";
import type { CreateServiceInput, ListServicesQuery } from "./service.schema";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListServicesResult {
  services: ServiceDocument[];
  meta: PaginationMeta;
}

/**
 * Lists the services patients can book (active ones only), one page at a time.
 *
 * `query` must already be validated by listServicesQuerySchema.
 */
export async function listServices(
  query: ListServicesQuery,
): Promise<ListServicesResult> {
  const { category, page, limit } = query;

  // Only add the category condition when the caller asked for one.
  const filter = { isActive: true, ...(category && { category }) };

  // Run the page query and the count at the same time.
  const [services, total] = await Promise.all([
    Service.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Service.countDocuments(filter),
  ]);

  return {
    services,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Adds a new service to the catalog.
 *
 * `input` must already be validated by createServiceSchema (the controller's job).
 * A duplicate slug is rejected by the unique index and reported as 409 by the errorHandler.
 */
export async function createService(
  input: CreateServiceInput,
): Promise<ServiceDocument> {
  return Service.create(input);
}
