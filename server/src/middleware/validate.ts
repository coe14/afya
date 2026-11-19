import type { RequestHandler } from "express";
import type { ZodType } from "zod";

/**
 * Creates a middleware that validates `req.body` against a Zod schema.
 *
 * - Valid body:   req.body is replaced with the cleaned result, then the request continues.
 * - Invalid body: Zod throws a ZodError, which Express passes to our global errorHandler
 *                 (it becomes a 400 VALIDATION_ERROR response).
 */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}
