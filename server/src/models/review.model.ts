import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { Booking } from "./booking.model";

/* ────────────────────────────────────────────────────────────
 * 1. Allowed values (later these move to config/constants.ts)
 * ──────────────────────────────────────────────────────────── */

export const REVIEW_MODERATION_STATUSES = ["visible", "hidden"] as const;
export type ReviewModerationStatus =
  (typeof REVIEW_MODERATION_STATUSES)[number];

/* ────────────────────────────────────────────────────────────
 * 2. TypeScript interfaces
 * ──────────────────────────────────────────────────────────── */

export interface IProviderResponse {
  text: string;
  respondedAt: Date;
}

export interface IReview {
  booking: Types.ObjectId;
  patient: Types.ObjectId;
  provider: Types.ObjectId;
  service: Types.ObjectId;

  rating: number; // whole number, 1 to 5
  comment?: string;

  providerResponse?: IProviderResponse;

  moderation: {
    status: ReviewModerationStatus;
    reason?: string;
    moderatedBy?: Types.ObjectId;
    moderatedAt?: Date;
  };

  // Added automatically by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<IReview>;

/* ────────────────────────────────────────────────────────────
 * 3. Sub-schemas
 * ──────────────────────────────────────────────────────────── */

const providerResponseSchema = new Schema<IProviderResponse>(
  {
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    respondedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

/* ────────────────────────────────────────────────────────────
 * 4. The Review schema
 * ──────────────────────────────────────────────────────────── */

const reviewSchema = new Schema<IReview>(
  {
    // These four links are fixed at creation: a review can never be moved to another booking, person or provider.
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      immutable: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      immutable: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      immutable: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "rating must be a whole number from 1 to 5",
      },
    },
    comment: { type: String, trim: true, maxlength: 1000 },

    providerResponse: { type: providerResponseSchema },

    moderation: {
      status: {
        type: String,
        enum: REVIEW_MODERATION_STATUSES,
        default: "visible",
        required: true,
      },
      reason: { type: String, trim: true, maxlength: 500 },
      moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
      moderatedAt: { type: Date },
    },
  },
  { timestamps: true },
);

/* ────────────────────────────────────────────────────────────
 * 5. Business rules that need another collection
 * ──────────────────────────────────────────────────────────── */

// When a NEW review is created, check it against the booking it claims to review.
reviewSchema.pre("validate", async function () {
  if (!this.isNew || !this.booking) return; // a missing booking is reported by `required`

  const booking = await Booking.findById(this.booking)
    .select("patient provider service status")
    .lean();

  if (!booking) {
    this.invalidate("booking", "Booking not found");
    return;
  }
  if (booking.status !== "completed") {
    this.invalidate("booking", "Only completed bookings can be reviewed");
  }
  if (String(booking.patient) !== String(this.patient)) {
    this.invalidate(
      "patient",
      "The reviewer must be the patient of this booking",
    );
  }
  if (String(booking.provider) !== String(this.provider)) {
    this.invalidate("provider", "The provider must match the booking");
  }
  if (String(booking.service) !== String(this.service)) {
    this.invalidate("service", "The service must match the booking");
  }
});

/* ────────────────────────────────────────────────────────────
 * 6. Indexes (as defined in ARCHITECTURE.md, section 2.7)
 * ──────────────────────────────────────────────────────────── */

// One review per booking.
reviewSchema.index({ booking: 1 }, { unique: true });

// Provider profile review list (visible reviews, newest first).
reviewSchema.index({ provider: 1, "moderation.status": 1, createdAt: -1 });

// "My reviews".
reviewSchema.index({ patient: 1, createdAt: -1 });

// Admin moderation queue.
reviewSchema.index({ "moderation.status": 1, createdAt: -1 });

/* ────────────────────────────────────────────────────────────
 * 7. The model
 * ──────────────────────────────────────────────────────────── */

export const Review = model<IReview>("Review", reviewSchema);
