import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { PROFESSIONS, type Profession } from "./service.model";
import {
  geoPointSchema,
  isWholeNumber,
  moneySchema,
  type IGeoPoint,
  type IMoney,
} from "./shared.schemas";

/* ────────────────────────────────────────────────────────────
 * 1. Allowed values (later these move to config/constants.ts)
 * ──────────────────────────────────────────────────────────── */

export const VERIFICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_info",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// "HH:mm" in 24-hour time, e.g. "08:30" or "17:00".
const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/* ────────────────────────────────────────────────────────────
 * 2. TypeScript interfaces
 * ──────────────────────────────────────────────────────────── */

export interface IQualification {
  title: string;
  institution?: string;
  year?: number;
}

export interface IServiceOffering {
  service: Types.ObjectId;
  customPrice?: IMoney;
  customDurationMinutes?: number;
  isActive: boolean;
}

export interface ITimeSlot {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface IWeeklyDay {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  slots: ITimeSlot[];
}

export interface ITimeOff {
  from: Date;
  to: Date;
  reason?: string;
}

export interface IProvider {
  user: Types.ObjectId;

  profession: Profession;
  headline?: string;
  bio?: string;
  yearsOfExperience?: number;
  specialties: string[];
  languages: string[];
  qualifications: IQualification[];

  license: {
    number: string;
    issuingBody: string;
    expiresAt?: Date;
    documentUrl?: string; // private
  };
  identityDocumentUrl?: string; // private

  verification: {
    status: VerificationStatus;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    rejectionReason?: string;
  };

  services: IServiceOffering[];

  serviceArea: {
    location: IGeoPoint;
    radiusKm: number;
    city?: string;
    region?: string;
  };

  availability: {
    timezone: string;
    weekly: IWeeklyDay[];
  };
  timeOff: ITimeOff[];

  isAcceptingBookings: boolean;

  // Denormalized counters (updated by services, never by users)
  ratingAverage: number;
  ratingCount: number;
  completedBookingsCount: number;

  // Added automatically by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderDocument = HydratedDocument<IProvider>;

/* ────────────────────────────────────────────────────────────
 * 3. Helpers
 * ──────────────────────────────────────────────────────────── */

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/* ────────────────────────────────────────────────────────────
 * 4. Sub-schemas
 * ──────────────────────────────────────────────────────────── */

const qualificationSchema = new Schema<IQualification>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    institution: { type: String, trim: true, maxlength: 120 },
    year: {
      type: Number,
      min: 1950,
      validate: [
        isWholeNumber,
        {
          validator: (value: number) => value <= new Date().getFullYear(),
          message: "year cannot be in the future",
        },
      ],
    },
  },
  { _id: false },
);

const serviceOfferingSchema = new Schema<IServiceOffering>(
  {
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    customPrice: { type: moneySchema },
    customDurationMinutes: {
      type: Number,
      min: 15,
      max: 1440,
      validate: isWholeNumber,
    },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    start: {
      type: String,
      required: true,
      match: [TIME_OF_DAY_REGEX, "start must be in HH:mm format"],
    },
    end: {
      type: String,
      required: true,
      match: [TIME_OF_DAY_REGEX, "end must be in HH:mm format"],
    },
  },
  { _id: false },
);

const weeklyDaySchema = new Schema<IWeeklyDay>(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      validate: isWholeNumber,
    },
    slots: { type: [timeSlotSchema], default: [] },
  },
  { _id: false },
);

// Keeps its own _id so a provider can remove one specific time-off entry.
const timeOffSchema = new Schema<ITimeOff>({
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  reason: { type: String, trim: true, maxlength: 200 },
});

/* ────────────────────────────────────────────────────────────
 * 5. The Provider schema
 * ──────────────────────────────────────────────────────────── */

const providerSchema = new Schema<IProvider>(
  {
    // One-to-one link to the account. immutable: a profile can never be moved to another user.
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    profession: { type: String, enum: PROFESSIONS, required: true },
    headline: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 1500 },
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 60,
      validate: isWholeNumber,
    },
    specialties: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
      default: [],
    },
    languages: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          match: [/^[a-z]{2}$/, "Use 2-letter ISO 639-1 language codes"],
        },
      ],
      default: [],
    },
    qualifications: { type: [qualificationSchema], default: [] },

    license: {
      number: { type: String, required: true, trim: true, maxlength: 60 },
      issuingBody: { type: String, required: true, trim: true, maxlength: 120 },
      expiresAt: { type: Date },
      // Private: hidden from queries unless explicitly requested with .select('+license.documentUrl')
      documentUrl: { type: String, trim: true, select: false },
    },
    identityDocumentUrl: { type: String, trim: true, select: false },

    verification: {
      status: {
        type: String,
        enum: VERIFICATION_STATUSES,
        default: "pending",
        required: true,
      },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      rejectionReason: { type: String, trim: true, maxlength: 500 },
    },

    services: { type: [serviceOfferingSchema], default: [] },

    serviceArea: {
      location: { type: geoPointSchema, required: true },
      radiusKm: { type: Number, required: true, default: 10, min: 1, max: 200 },
      city: { type: String, trim: true },
      region: { type: String, trim: true },
    },

    availability: {
      timezone: {
        type: String,
        default: "UTC",
        validate: {
          validator: isValidTimeZone,
          message: "{VALUE} is not a valid IANA time zone",
        },
      },
      weekly: { type: [weeklyDaySchema], default: [] },
    },
    timeOff: { type: [timeOffSchema], default: [] },

    // The provider's own "pause" switch.
    isAcceptingBookings: { type: Boolean, default: true, required: true },

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0, validate: isWholeNumber },
    completedBookingsCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: isWholeNumber,
    },
  },
  { timestamps: true },
);

/* ────────────────────────────────────────────────────────────
 * 6. Validation that involves more than one field
 * ──────────────────────────────────────────────────────────── */

providerSchema.pre("validate", function () {
  // Every time slot must end after it starts ("HH:mm" strings compare correctly as text).
  for (const day of this.availability.weekly) {
    for (const slot of day.slots) {
      if (slot.end <= slot.start) {
        this.invalidate(
          "availability.weekly",
          `Slot ${slot.start}-${slot.end} must end after it starts`,
        );
      }
    }
  }

  // Time off must not end before it starts.
  for (const entry of this.timeOff) {
    if (entry.to < entry.from) {
      this.invalidate(
        "timeOff",
        'Time off "to" date must not be earlier than "from" date',
      );
    }
  }

  // The same catalog service cannot be listed twice.
  const serviceIds = this.services.map((offering) => String(offering.service));
  if (new Set(serviceIds).size !== serviceIds.length) {
    this.invalidate(
      "services",
      "The same service cannot be offered more than once",
    );
  }
});

/* ────────────────────────────────────────────────────────────
 * 7. Indexes (as defined in ARCHITECTURE.md, section 2.4)
 * ──────────────────────────────────────────────────────────── */

// One profile per user; fast lookup by user.
providerSchema.index({ user: 1 }, { unique: true });

// "Providers near me" geo queries.
providerSchema.index({ "serviceArea.location": "2dsphere" });

// Admin verification queue (oldest first).
providerSchema.index({ "verification.status": 1, createdAt: 1 });

// Search by service among approved providers, best-rated first.
providerSchema.index({
  "services.service": 1,
  "verification.status": 1,
  ratingAverage: -1,
});

// Browse by profession.
providerSchema.index({
  profession: 1,
  isAcceptingBookings: 1,
  ratingAverage: -1,
});

// Keyword search.
providerSchema.index({ headline: "text", bio: "text", specialties: "text" });

/* ────────────────────────────────────────────────────────────
 * 8. The model
 * ──────────────────────────────────────────────────────────── */

export const Provider = model<IProvider>("Provider", providerSchema);
