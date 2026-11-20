import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../models";

/**
 * Creates a short-lived access token.
 *
 * The token carries only what the server needs to recognise the caller:
 *   - sub  (subject): the user's id
 *   - role: the user's role, for quick permission checks
 * Never put secrets or personal/medical data in a JWT: anyone can read its payload.
 */
export function signAccessToken(user: { id: string; role: UserRole }): string {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
  });
}
