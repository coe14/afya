import type { RequestHandler } from "express";
import { ApiError } from "../../utils/ApiError";
import { getCurrentUser } from "./user.service";

// GET /api/v1/users/me
export const getMe: RequestHandler = async (req, res) => {
  // `authenticate` sets req.user; this guard also protects us if a route forgets to use it.
  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  const user = await getCurrentUser(req.user.id);

  res.status(200).json({ data: { user } });
};
