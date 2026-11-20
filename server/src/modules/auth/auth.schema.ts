import { z } from 'zod';

/* ────────────────────────────────────────────────────────────
 * 1. Rules and constants
 * ──────────────────────────────────────────────────────────── */

// Only these roles can be chosen at sign-up. Admin accounts are created by a seed script.
export const REGISTERABLE_ROLES = ['patient', 'provider'] as const;

const MIN_PASSWORD_LENGTH = 8;

// bcrypt only reads the first 72 BYTES of a password, so we refuse anything longer.
const MAX_PASSWORD_BYTES = 72;

/* ────────────────────────────────────────────────────────────
 * 2. Reusable field rules
 * ──────────────────────────────────────────────────────────── */

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .email('Please provide a valid email address');

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES,
    `Password is too long (maximum ${MAX_PASSWORD_BYTES} bytes; non-English characters use more than one byte each)`,
  )
  .refine((value) => /\p{L}/u.test(value), 'Password must contain at least one letter')
  .refine((value) => /\d/.test(value), 'Password must contain at least one number');

const nameSchema = z.string().trim().min(1, 'This field is required').max(50, 'Maximum 50 characters');

/* ────────────────────────────────────────────────────────────
 * 3. Registration
 * ──────────────────────────────────────────────────────────── */

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(REGISTERABLE_ROLES),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in international format, e.g. +251911234567')
    .optional(),
});

/* ────────────────────────────────────────────────────────────
 * 4. Login
 * ──────────────────────────────────────────────────────────── */

// Login does NOT re-apply the sign-up password rules: it only checks that something was sent.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});

/* ────────────────────────────────────────────────────────────
 * 5. TypeScript types derived from the schemas
 * ──────────────────────────────────────────────────────────── */

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;