import jwt, { TokenExpiredError, type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { USER_ROLES, type UserRole } from '../models';
import { ApiError } from './ApiError';

/** The small amount of identity information carried inside an access token. */
export interface AuthUser {
  id: string;
  role: UserRole;
}

/**
 * Creates a short-lived access token.
 *
 * The token carries only what the server needs to recognise the caller:
 *   - sub  (subject): the user's id
 *   - role: the user's role, for quick permission checks
 * Never put secrets or personal/medical data in a JWT: anyone can read its payload.
 */
export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  });
}

/**
 * Checks an access token and returns who it belongs to.
 * Throws a 401 ApiError if the token is expired, tampered with, or malformed.
 */
export function verifyAccessToken(token: string): AuthUser {
  let decoded: string | JwtPayload;

  try {
    // Checks the signature AND the expiry date. Only HS256 is accepted.
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Access token has expired');
    }
    throw new ApiError(401, 'INVALID_TOKEN', 'Invalid access token');
  }

  // Defensive check: the signature is valid, but make sure the payload has the shape we expect.
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || !USER_ROLES.includes(decoded.role)) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Invalid access token');
  }

  return { id: decoded.sub, role: decoded.role };
}