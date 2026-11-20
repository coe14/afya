import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getMe } from "./user.controller";

export const userRouter = Router();

// GET /api/v1/users/me  (protected)
userRouter.get("/me", authenticate, getMe);
