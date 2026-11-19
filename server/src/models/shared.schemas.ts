import { Schema } from "mongoose";

/* ────────────────────────────────────────────────────────────
 * Building blocks shared by several models.
 * Nothing in this file depends on any other model.
 * ──────────────────────────────────────────────────────────── */

/* ── Whole-number validator ─────────────────────────────────── */

export const isWholeNumber = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number",
};

/* ── GeoJSON point ──────────────────────────────────────────── */

export interface IGeoPoint {
  type: "Point";
  coordinates: number[]; // [longitude, latitude]
}

export const geoPointSchema = new Schema<IGeoPoint>(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]) =>
          value.length === 2 &&
          value[0] >= -180 &&
          value[0] <= 180 &&
          value[1] >= -90 &&
          value[1] <= 90,
        message:
          "coordinates must be [longitude, latitude] within valid ranges",
      },
    },
  },
  { _id: false },
);

/* ── Money ──────────────────────────────────────────────────── */

export interface IMoney {
  amount: number; // minor currency units (e.g. cents / santim)
  currency: string; // ISO 4217 code, e.g. "ETB"
}

// Field definition for an amount of money: a whole, non-negative number in minor units.
export const moneyField = {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: Number.isInteger,
    message: "{PATH} must be a whole number in minor currency units",
  },
};

// Field definition for a 3-letter currency code.
export const currencyField = {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
  minlength: 3,
  maxlength: 3,
};

// A sub-schema (not a nested path) so it can be OPTIONAL on its parent:
// its required fields are only checked when a money value is actually provided.
export const moneySchema = new Schema<IMoney>(
  {
    amount: moneyField,
    currency: currencyField,
  },
  { _id: false },
);
