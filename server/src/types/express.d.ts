import type { AuthUser } from "../utils/tokens";

// Tells TypeScript that Express requests may carry a `user` property
// (set by the authenticate middleware).
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
