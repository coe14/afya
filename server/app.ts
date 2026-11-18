import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

/**
 * Builds the Express app. It is exported separately from server.ts
 * so integration tests can import it without opening a network port.
 */
export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/v1", apiRouter);

// Order matters: 404 first, global error handler last.
app.use(notFoundHandler);
app.use(errorHandler);
