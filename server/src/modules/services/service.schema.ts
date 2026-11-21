import { z } from "zod";
import { PRICING_MODELS, PROFESSIONS, SERVICE_CATEGORIES } from "../../models";

/* ────────────────────────────────────────────────────────────
 * 1. Create a service (admin only)
 * ──────────────────────────────────────────────────────────── */

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Maximum 120 characters"),

  // Optional: if omitted, the model generates it from the name.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may only contain lowercase letters, numbers and single hyphens",
    )
    .optional(),

  category: z.enum(SERVICE_CATEGORIES),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Maximum 2000 characters"),

  // Only http(s) links: blocks values like "javascript:..." that are dangerous if shown as a link or image.
  imageUrl: z
    .string()
    .trim()
    .max(2048)
    .regex(/^https?:\/\//i, "Image URL must start with http:// or https://")
    .optional(),

  pricingModel: z.enum(PRICING_MODELS),
  basePrice: z.object({
    // Whole number in minor units (e.g. 2500 = 25.00).
    amount: z
      .number()
      .int("Amount must be a whole number in minor currency units")
      .min(0),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code, e.g. USD"),
  }),
  defaultDurationMinutes: z
    .number()
    .int()
    .min(15, "Minimum 15 minutes")
    .max(1440, "Maximum 1440 minutes (24 hours)"),

  allowedProfessions: z.array(z.enum(PROFESSIONS)).default([]),
  requiresPrescription: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

/* ────────────────────────────────────────────────────────────
 * 2. List services (public): filters come from the URL query string
 * ──────────────────────────────────────────────────────────── */

export const listServicesQuerySchema = z.object({
  category: z.enum(SERVICE_CATEGORIES).optional(),

  // Query-string values are always text ("2"), so z.coerce.number() converts them first.
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* ────────────────────────────────────────────────────────────
 * 3. TypeScript types derived from the schemas
 * ──────────────────────────────────────────────────────────── */

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
