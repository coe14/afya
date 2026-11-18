import type { Server } from "node:http";
import { app } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";

let server: Server | undefined;
let shuttingDown = false;

async function bootstrap(): Promise<void> {
  await connectDB();

  server = app.listen(env.PORT, () => {
    logger.info("Server listening", {
      port: env.PORT,
      environment: env.NODE_ENV,
      health: `http://localhost:${env.PORT}/api/v1/health`,
    });
  });
}

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down", { reason });

  // Safety net: never hang forever on open connections.
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();

  try {
    const current = server;
    if (current) {
      await new Promise<void>((resolve, reject) => {
        current.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await disconnectDB();
    process.exit(exitCode);
  } catch (error) {
    logger.error("Error during shutdown", { error });
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", { error });
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  void shutdown("uncaughtException", 1);
});

bootstrap().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
