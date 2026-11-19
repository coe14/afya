import mongoose from "mongoose";
import { env, isProduction } from "./env";
import { logger } from "../utils/logger";

mongoose.set("strictQuery", true);

// Registered once at module load so reconnects never stack duplicate listeners.
mongoose.connection.on("connected", () => {
  logger.info("MongoDB connected", {
    host: mongoose.connection.host,
    database: mongoose.connection.name,
  });
});
mongoose.connection.on("disconnected", () =>
  logger.warn("MongoDB disconnected"),
);
mongoose.connection.on("error", (error) =>
  logger.error("MongoDB connection error", { error }),
);

export async function connectDB(): Promise<typeof mongoose> {
  return mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    // In production, indexes are created deliberately via scripts/syncIndexes.ts.
    autoIndex: !isProduction,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
