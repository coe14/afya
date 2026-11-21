/**
 * Seed script: creates the first admin account and a starter service catalog.
 *
 *   npm run seed -w server
 *
 * Safe to run more than once (see the notes next to each step).
 */
import { z } from "zod";
import { connectDB, disconnectDB } from "../config/db";
import { isProduction } from "../config/env"; // also loads server/.env
import { Service, User, type IService } from "../models";
import { registerSchema } from "../modules/auth/auth.schema";

/* ────────────────────────────────────────────────────────────
 * 1. Seed settings (read from server/.env)
 * ──────────────────────────────────────────────────────────── */

// Reuse the sign-up rules so the admin email and password are held to the same standard.
const seedEnvSchema = z.object({
  SEED_ADMIN_EMAIL: registerSchema.shape.email,
  SEED_ADMIN_PASSWORD: registerSchema.shape.password,
  SEED_ADMIN_FIRST_NAME: z.string().trim().min(1).default("Afya"),
  SEED_ADMIN_LAST_NAME: z.string().trim().min(1).default("Admin"),
  SEED_CURRENCY: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "SEED_CURRENCY must be a 3-letter code, e.g. USD")
    .default("USD"),
});

type SeedConfig = z.infer<typeof seedEnvSchema>;

function readSeedConfig(): SeedConfig {
  const parsed = seedEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.map(String).join(".")}: ${issue.message}`,
      )
      .join("\n");
    console.error(`\nInvalid seed settings in server/.env:\n${problems}\n`);
    console.error(
      "Add SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (see .env.example).\n",
    );
    process.exit(1);
  }

  return parsed.data;
}

/* ────────────────────────────────────────────────────────────
 * 2. Starter catalog
 * ──────────────────────────────────────────────────────────── */

// `price` is in normal units (e.g. 25 = 25.00). It is converted to minor units when saved.
// These are PLACEHOLDER prices: adjust them to your market.
type SeedService = Pick<
  IService,
  | "name"
  | "slug"
  | "category"
  | "description"
  | "pricingModel"
  | "defaultDurationMinutes"
  | "allowedProfessions"
  | "requiresPrescription"
> & { price: number };

const CATALOG: SeedService[] = [
  // ── Nursing ──────────────────────────────────────────────
  {
    name: "Wound Dressing & Care",
    slug: "wound-dressing-care",
    category: "nursing",
    description:
      "Cleaning, dressing and monitoring of surgical, diabetic or pressure wounds at home.",
    pricingModel: "fixed",
    price: 20,
    defaultDurationMinutes: 45,
    allowedProfessions: ["nurse"],
    requiresPrescription: false,
  },
  {
    name: "Injection Administration",
    slug: "injection-administration",
    category: "nursing",
    description:
      "Safe administration of prescribed intramuscular or subcutaneous injections.",
    pricingModel: "fixed",
    price: 12,
    defaultDurationMinutes: 20,
    allowedProfessions: ["nurse"],
    requiresPrescription: true,
  },
  {
    name: "IV Infusion Therapy",
    slug: "iv-infusion-therapy",
    category: "nursing",
    description:
      "Setup and monitoring of prescribed intravenous fluids or medication at home.",
    pricingModel: "fixed",
    price: 35,
    defaultDurationMinutes: 90,
    allowedProfessions: ["nurse"],
    requiresPrescription: true,
  },
  {
    name: "Vital Signs & Health Check",
    slug: "vital-signs-health-check",
    category: "nursing",
    description:
      "Blood pressure, pulse, temperature, oxygen level and blood sugar check with a short report.",
    pricingModel: "fixed",
    price: 15,
    defaultDurationMinutes: 30,
    allowedProfessions: ["nurse"],
    requiresPrescription: false,
  },
  {
    name: "Post-Surgical Nursing Care",
    slug: "post-surgical-nursing-care",
    category: "nursing",
    description:
      "Hourly nursing support after surgery: medication, wound checks, mobility and comfort care.",
    pricingModel: "hourly",
    price: 18,
    defaultDurationMinutes: 60,
    allowedProfessions: ["nurse"],
    requiresPrescription: false,
  },

  // ── Physiotherapy ────────────────────────────────────────
  {
    name: "Physiotherapy Session",
    slug: "physiotherapy-session",
    category: "physiotherapy",
    description:
      "One-to-one physiotherapy at home: assessment, exercises and hands-on treatment.",
    pricingModel: "fixed",
    price: 30,
    defaultDurationMinutes: 60,
    allowedProfessions: ["physiotherapist"],
    requiresPrescription: false,
  },
  {
    name: "Stroke Rehabilitation Session",
    slug: "stroke-rehabilitation-session",
    category: "physiotherapy",
    description:
      "Guided movement, balance and strength training to support recovery after a stroke.",
    pricingModel: "fixed",
    price: 35,
    defaultDurationMinutes: 60,
    allowedProfessions: ["physiotherapist"],
    requiresPrescription: false,
  },
  {
    name: "Back & Joint Pain Therapy",
    slug: "back-joint-pain-therapy",
    category: "physiotherapy",
    description:
      "Targeted treatment and exercise plan for back, neck, knee or shoulder pain.",
    pricingModel: "fixed",
    price: 28,
    defaultDurationMinutes: 45,
    allowedProfessions: ["physiotherapist"],
    requiresPrescription: false,
  },

  // ── Doctor visits ────────────────────────────────────────
  {
    name: "General Practitioner Home Visit",
    slug: "general-practitioner-home-visit",
    category: "other",
    description:
      "A doctor visits the home to examine, diagnose and prescribe for common health problems.",
    pricingModel: "fixed",
    price: 45,
    defaultDurationMinutes: 45,
    allowedProfessions: ["doctor"],
    requiresPrescription: false,
  },
  {
    name: "Chronic Condition Follow-up Visit",
    slug: "chronic-condition-follow-up-visit",
    category: "chronic_care",
    description:
      "Regular check-up for conditions such as diabetes or hypertension, with medication review.",
    pricingModel: "fixed",
    price: 40,
    defaultDurationMinutes: 40,
    allowedProfessions: ["doctor"],
    requiresPrescription: false,
  },

  // ── Elder care ───────────────────────────────────────────
  {
    name: "Elderly Companion & Daily Living Support",
    slug: "elderly-companion-daily-living-support",
    category: "elderly_care",
    description:
      "Hourly help with bathing, meals, mobility, reminders and company for older adults.",
    pricingModel: "hourly",
    price: 10,
    defaultDurationMinutes: 60,
    allowedProfessions: ["caregiver", "nurse"],
    requiresPrescription: false,
  },
  {
    name: "Overnight Elderly Care",
    slug: "overnight-elderly-care",
    category: "elderly_care",
    description:
      "A caregiver stays through the night to assist and keep a close eye on an older adult.",
    pricingModel: "fixed",
    price: 60,
    defaultDurationMinutes: 600,
    allowedProfessions: ["caregiver", "nurse"],
    requiresPrescription: false,
  },
];

/* ────────────────────────────────────────────────────────────
 * 3. Seeding steps
 * ──────────────────────────────────────────────────────────── */

async function seedAdmin(config: SeedConfig): Promise<void> {
  const email = config.SEED_ADMIN_EMAIL;

  const existing = await User.findOne({ email }).select("role");

  if (existing) {
    // Never overwrite an existing account's password or role.
    console.log(
      existing.role === "admin"
        ? `Admin: ${email} already exists, skipped.`
        : `Admin: WARNING ${email} exists but its role is "${existing.role}". Left unchanged.`,
    );
    return;
  }

  const admin = new User({
    email,
    firstName: config.SEED_ADMIN_FIRST_NAME,
    lastName: config.SEED_ADMIN_LAST_NAME,
    role: "admin",
    isEmailVerified: true,
  });
  await admin.setPassword(config.SEED_ADMIN_PASSWORD);
  await admin.save();

  console.log(`Admin: created ${email}`);
}

async function seedServices(currency: string): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const { price, ...service } of CATALOG) {
    const result = await Service.updateOne(
      { slug: service.slug },
      {
        // Always bring the catalog entry up to date with this file...
        $set: {
          ...service,
          // Math.round avoids floating-point surprises (19.99 * 100 = 1998.9999...).
          basePrice: { amount: Math.round(price * 100), currency },
        },
        // ...but only turn it on when first created, so a service an admin deactivated stays off.
        $setOnInsert: { isActive: true },
      },
      { upsert: true, runValidators: true },
    );

    if (result.upsertedCount > 0) created++;
    else updated++;
  }

  console.log(
    `Services: ${created} created, ${updated} updated (${CATALOG.length} in catalog, currency ${currency}).`,
  );
}

/* ────────────────────────────────────────────────────────────
 * 4. Run
 * ──────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  if (isProduction && !process.argv.includes("--allow-production")) {
    console.error(
      "Refusing to seed while NODE_ENV=production. Re-run with --allow-production if you really mean it.",
    );
    process.exit(1);
  }

  const config = readSeedConfig();

  await connectDB();

  // Make sure unique indexes exist before writing, so duplicates are rejected properly.
  await Promise.all([User.init(), Service.init()]);

  await seedAdmin(config);
  await seedServices(config.SEED_CURRENCY);

  console.log("Seed finished.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
