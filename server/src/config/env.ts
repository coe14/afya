import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load server/.env regardless of the current working directory.
// In production, variables normally come from the platform and no file exists (that is fine).
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    ),

  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().min(1).default("15m"),
  JWT_REFRESH_TTL: z.string().min(1).default("7d"),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Logger depends on env, so report with console and fail fast.
  const problems = parsed.error.issues
    .map(
      (issue) =>
        `  - ${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
    )
    .join("\n");
  console.error(`\nInvalid environment configuration:\n${problems}\n`);
  console.error(
    "Copy server/.env.example to server/.env and fix the values above.\n",
  );
  process.exit(1);
}

export const env: Env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
