import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/tokens";

// Matches "Bearer <token>" (the word "Bearer" is case-insensitive).
const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/**
 * Protects a route: the request must carry a valid access token in the header
 *   Authorization: Bearer <token>
 * On success, `req.user` is set to { id, role }. Otherwise the request stops with a 401.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const match = BEARER_PATTERN.exec(req.headers.authorization ?? "");

  if (!match) {
    throw ApiError.unauthorized("Authentication required");
  }

  req.user = verifyAccessToken(match[1]);
  next();
};
