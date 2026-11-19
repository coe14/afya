import bcrypt from "bcryptjs";
import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import { geoPointSchema, type IGeoPoint } from "./shared.schemas";

/* ────────────────────────────────────────────────────────────
 * 1. Allowed values (later these move to config/constants.ts)
 * ──────────────────────────────────────────────────────────── */

export const USER_ROLES = ["patient", "provider", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "suspended", "deactivated"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const GENDERS = ["male", "female", "other", "undisclosed"] as const;
export type Gender = (typeof GENDERS)[number];

// Higher = safer but slower. 12 is a common, sensible choice today.
const BCRYPT_ROUNDS = 12;
const MAX_SAVED_ADDRESSES = 10;

/* ────────────────────────────────────────────────────────────
 * 2. TypeScript interfaces
 * ──────────────────────────────────────────────────────────── */

export interface IUserAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  country: string;
  location: IGeoPoint;
  isDefault: boolean;
}

export interface IEmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

// Used for email-verification and password-reset links.
// We store only a HASH of the token, never the token itself.
export interface IOneTimeToken {
  tokenHash: string;
  expiresAt: Date;
}

export interface IRefreshToken {
  tokenHash: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface IUser {
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;

  firstName: string;
  lastName: string;
  gender?: Gender;
  dateOfBirth?: Date;
  avatarUrl?: string;

  addresses: IUserAddress[];
  emergencyContact?: IEmergencyContact;

  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;

  emailVerification?: IOneTimeToken;
  passwordReset?: IOneTimeToken;
  refreshTokens: IRefreshToken[];

  lastLoginAt?: Date;

  // Added automatically by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

// Methods that every user document will have (defined in section 6).
export interface IUserMethods {
  setPassword(plainPassword: string): Promise<void>;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

/* ────────────────────────────────────────────────────────────
 * 3. Sub-schemas
 * ──────────────────────────────────────────────────────────── */

// Saved addresses keep their own _id so the client can edit or delete one by id.
const userAddressSchema = new Schema<IUserAddress>({
  label: { type: String, trim: true, maxlength: 50 },
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
  isDefault: { type: Boolean, default: false },
});

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true },
  },
  { _id: false },
);

const oneTimeTokenSchema = new Schema<IOneTimeToken>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true },
    userAgent: { type: String, trim: true, maxlength: 300 },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

/* ────────────────────────────────────────────────────────────
 * 4. The User schema
 * ──────────────────────────────────────────────────────────── */

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^\+[1-9]\d{6,14}$/,
        "Phone must be in international format, e.g. +251911234567",
      ],
    },
    passwordHash: { type: String, required: true, select: false },

    // immutable: the role can be set when the account is created, but never changed afterwards.
    role: { type: String, enum: USER_ROLES, required: true, immutable: true },

    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    gender: { type: String, enum: GENDERS },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value: Date) => value <= new Date(),
        message: "dateOfBirth cannot be in the future",
      },
    },
    avatarUrl: { type: String, trim: true },

    addresses: {
      type: [userAddressSchema],
      default: [],
      validate: {
        validator: (value: unknown[]) => value.length <= MAX_SAVED_ADDRESSES,
        message: `You can save at most ${MAX_SAVED_ADDRESSES} addresses`,
      },
    },
    emergencyContact: { type: emergencyContactSchema },

    status: {
      type: String,
      enum: USER_STATUSES,
      default: "active",
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false, required: true },
    isPhoneVerified: { type: Boolean, default: false, required: true },

    // Security-related data is hidden from query results unless explicitly requested.
    emailVerification: { type: oneTimeTokenSchema, select: false },
    passwordReset: { type: oneTimeTokenSchema, select: false },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      // Safety net: even if a whole user document is sent in a response,
      // secrets are stripped out.
      transform: (_doc, ret) => {
        const output = ret as Record<string, unknown>;
        delete output.passwordHash;
        delete output.emailVerification;
        delete output.passwordReset;
        delete output.refreshTokens;
        delete output.__v;
        return output;
      },
    },
  },
);

/* ────────────────────────────────────────────────────────────
 * 5. Indexes (as defined in ARCHITECTURE.md, section 2.3)
 * ──────────────────────────────────────────────────────────── */

// Login lookup, and no two accounts can share an email.
userSchema.index({ email: 1 }, { unique: true });

// Unique only when a phone number exists (accounts without a phone are skipped).
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

// Admin user lists filtered by role and status.
userSchema.index({ role: 1, status: 1 });

// Find the owner of a refresh token quickly.
userSchema.index({ "refreshTokens.tokenHash": 1 }, { sparse: true });

/* ────────────────────────────────────────────────────────────
 * 6. Password methods
 * ──────────────────────────────────────────────────────────── */

userSchema.method(
  "setPassword",
  async function (plainPassword: string): Promise<void> {
    this.passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  },
);

userSchema.method(
  "comparePassword",
  async function (candidatePassword: string): Promise<boolean> {
    if (!this.passwordHash) {
      throw new Error(
        'passwordHash was not loaded. Query with .select("+passwordHash") before calling comparePassword().',
      );
    }
    return bcrypt.compare(candidatePassword, this.passwordHash);
  },
);

/* ────────────────────────────────────────────────────────────
 * 7. The model
 * ──────────────────────────────────────────────────────────── */

export const User = model<IUser, UserModel>("User", userSchema);
