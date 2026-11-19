import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import {
  currencyField,
  geoPointSchema,
  moneyField,
  type IGeoPoint,
} from "./shared.schemas";

/* ────────────────────────────────────────────────────────────
 * 1. Allowed values (later these move to config/constants.ts)
 * ──────────────────────────────────────────────────────────── */

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Statuses in which a booking still "occupies" the provider's time slot.
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
];

export const PAYMENT_STATUSES = [
  "unpaid",
  "paid",
  "refunded",
  "failed",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CANCELLER_ROLES = [
  "patient",
  "provider",
  "admin",
  "system",
] as const;
export type CancellerRole = (typeof CANCELLER_ROLES)[number];

/* ────────────────────────────────────────────────────────────
 * 2. TypeScript interfaces (the "shape" of our data)
 * ──────────────────────────────────────────────────────────── */

export interface IAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  country: string;
  location: IGeoPoint;
}

export interface IRecipientInfo {
  name: string;
  age?: number;
  relationship?: string;
}

export interface IStatusHistoryEntry {
  status: BookingStatus;
  changedBy?: Types.ObjectId;
  at: Date;
  reason?: string;
}

export interface ICancellation {
  cancelledBy?: Types.ObjectId;
  role: CancellerRole;
  reason?: string;
  at: Date;
}

export interface IBooking {
  bookingNumber: string;

  patient: Types.ObjectId;
  provider: Types.ObjectId;
  service: Types.ObjectId;

  serviceSnapshot: {
    name: string;
    category: string;
    durationMinutes: number;
  };

  scheduledStart: Date;
  scheduledEnd: Date;
  address: IAddress;

  patientNotes?: string;
  recipientInfo?: IRecipientInfo;

  status: BookingStatus;
  statusHistory: IStatusHistoryEntry[];
  responseDeadline?: Date;

  pricing: {
    currency: string;
    subtotal: number;
    platformFee: number;
    total: number;
  };

  payment: {
    status: PaymentStatus;
    method?: string;
    transactionRef?: string;
    paidAt?: Date;
    refundedAt?: Date;
  };

  cancellation?: ICancellation;

  visitNotes?: string;
  startedAt?: Date;
  completedAt?: Date;

  review?: Types.ObjectId;

  // Added automatically by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDocument = HydratedDocument<IBooking>;

/* ────────────────────────────────────────────────────────────
 * 3. Sub-schemas (small documents embedded inside a booking)
 * ──────────────────────────────────────────────────────────── */

const addressSchema = new Schema<IAddress>(
  {
    label: { type: String, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
    location: { type: geoPointSchema, required: true },
  },
  { _id: false },
);

const recipientInfoSchema = new Schema<IRecipientInfo>(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 120 },
    relationship: { type: String, trim: true },
  },
  { _id: false },
);

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const cancellationSchema = new Schema<ICancellation>(
  {
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: CANCELLER_ROLES, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    at: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

/* ────────────────────────────────────────────────────────────
 * 4. The Booking schema
 * ──────────────────────────────────────────────────────────── */

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },

    serviceSnapshot: {
      name: { type: String, required: true, trim: true },
      category: { type: String, required: true, trim: true },
      durationMinutes: { type: Number, required: true, min: 1 },
    },

    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    address: { type: addressSchema, required: true },

    patientNotes: { type: String, trim: true, maxlength: 2000, select: false },
    recipientInfo: { type: recipientInfoSchema },

    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "pending",
      required: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    responseDeadline: { type: Date },

    pricing: {
      currency: currencyField,
      subtotal: moneyField,
      platformFee: { ...moneyField, default: 0 },
      total: moneyField,
    },

    payment: {
      status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: "unpaid",
        required: true,
      },
      method: { type: String, trim: true },
      transactionRef: { type: String, trim: true },
      paidAt: { type: Date },
      refundedAt: { type: Date },
    },

    cancellation: { type: cancellationSchema },

    visitNotes: { type: String, trim: true, maxlength: 5000, select: false },
    startedAt: { type: Date },
    completedAt: { type: Date },

    review: { type: Schema.Types.ObjectId, ref: "Review" },
  },
  { timestamps: true },
);

/* ────────────────────────────────────────────────────────────
 * 5. Validation that involves more than one field
 * ──────────────────────────────────────────────────────────── */

bookingSchema.pre("validate", function () {
  if (
    this.scheduledStart &&
    this.scheduledEnd &&
    this.scheduledEnd <= this.scheduledStart
  ) {
    this.invalidate(
      "scheduledEnd",
      "scheduledEnd must be later than scheduledStart",
    );
  }
});

/* ────────────────────────────────────────────────────────────
 * 6. Indexes (as defined in ARCHITECTURE.md, section 2.6)
 * ──────────────────────────────────────────────────────────── */

// Lookup by human-friendly code.
bookingSchema.index({ bookingNumber: 1 }, { unique: true });

// Patient's booking list, newest first.
bookingSchema.index({ patient: 1, scheduledStart: -1 });

// Provider's schedule and request inbox.
bookingSchema.index({ provider: 1, status: 1, scheduledStart: 1 });

// Admin views and background jobs.
bookingSchema.index({ status: 1, scheduledStart: 1 });

// Auto-expire unanswered requests (only indexes pending bookings).
bookingSchema.index(
  { status: 1, responseDeadline: 1 },
  { partialFilterExpression: { status: "pending" } },
);

// Prevent double-booking: one active booking per provider per start time.
bookingSchema.index(
  { provider: 1, scheduledStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: [...ACTIVE_BOOKING_STATUSES] } },
  },
);

/* ────────────────────────────────────────────────────────────
 * 7. The model
 * ──────────────────────────────────────────────────────────── */

export const Booking = model<IBooking>("Booking", bookingSchema);
