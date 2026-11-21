import type { RequestHandler } from "express";
import type { UserRole } from "../models";
import { ApiError } from "../utils/ApiError";

/**
 * Restricts a route to certain roles. Always place it AFTER `authenticate`.
 *
 *   router.post('/', authenticate, authorize('admin'), handler);
 *   router.get('/x', authenticate, authorize('provider', 'admin'), handler);
 *
 * - No logged-in user  -> 401 (who are you?)
 * - Wrong role         -> 403 (I know who you are, but you may not do this)
 */
export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden();
    }
    next();
  };
}
