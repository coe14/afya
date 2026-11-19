import { Schema, model, type HydratedDocument } from "mongoose";

/* ────────────────────────────────────────────────────────────
 * 1. Allowed values (later these move to config/constants.ts)
 * ──────────────────────────────────────────────────────────── */

export const SERVICE_CATEGORIES = [
  "nursing",
  "elderly_care",
  "physiotherapy",
  "maternal_newborn",
  "chronic_care",
  "lab_sampling",
  "palliative",
  "other",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const PRICING_MODELS = ["fixed", "hourly"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

// The Provider model will reuse this list for a provider's profession.
export const PROFESSIONS = [
  "nurse",
  "caregiver",
  "physiotherapist",
  "doctor",
  "midwife",
  "lab_technician",
  "other",
] as const;
export type Profession = (typeof PROFESSIONS)[number];

/* ────────────────────────────────────────────────────────────
 * 2. TypeScript interface
 * ──────────────────────────────────────────────────────────── */

export interface IService {
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string;
  imageUrl?: string;

  pricingModel: PricingModel;
  basePrice: {
    amount: number; // minor currency units (e.g. cents)
    currency: string; // e.g. "ETB", "USD"
  };
  defaultDurationMinutes: number;

  allowedProfessions: Profession[]; // empty array = any profession may offer it
  requiresPrescription: boolean;
  isActive: boolean;

  // Added automatically by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceDocument = HydratedDocument<IService>;

/* ────────────────────────────────────────────────────────────
 * 3. Helpers
 * ──────────────────────────────────────────────────────────── */

// "Post-Surgical Wound Dressing!" -> "post-surgical-wound-dressing"
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ────────────────────────────────────────────────────────────
 * 4. The Service schema
 * ──────────────────────────────────────────────────────────── */

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "slug may only contain lowercase letters, numbers and single hyphens",
      ],
    },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrl: { type: String, trim: true },

    pricingModel: { type: String, enum: PRICING_MODELS, required: true },
    basePrice: {
      amount: {
        type: Number,
        required: true,
        min: 0,
        validate: {
          validator: Number.isInteger,
          message: "{PATH} must be a whole number in minor currency units",
        },
      },
      currency: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 3,
        maxlength: 3,
      },
    },
    defaultDurationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 1440,
      validate: {
        validator: Number.isInteger,
        message: "{PATH} must be a whole number of minutes",
      },
    },

    allowedProfessions: {
      type: [{ type: String, enum: PROFESSIONS }],
      default: [],
    },
    requiresPrescription: { type: Boolean, default: false },
    // Inactive services are hidden from patients but never deleted (old bookings still point to them).
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/* ────────────────────────────────────────────────────────────
 * 5. Auto-generate the slug
 * ──────────────────────────────────────────────────────────── */

serviceSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

/* ────────────────────────────────────────────────────────────
 * 6. Indexes (as defined in ARCHITECTURE.md, section 2.5)
 * ──────────────────────────────────────────────────────────── */

// Public URLs, and no two services can share a slug.
serviceSchema.index({ slug: 1 }, { unique: true });

// Catalog browsing by category.
serviceSchema.index({ category: 1, isActive: 1 });

// Keyword search.
serviceSchema.index({ name: "text", description: "text" });

/* ────────────────────────────────────────────────────────────
 * 7. The model
 * ──────────────────────────────────────────────────────────── */

export const Service = model<IService>("Service", serviceSchema);
