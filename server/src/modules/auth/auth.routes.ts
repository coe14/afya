import { Router } from "express";
import { validateBody } from "../../middleware/validate";
import { register } from "./auth.controller";
import { registerSchema } from "./auth.schema";

export const authRouter = Router();

// POST /api/v1/auth/register
authRouter.post("/register", validateBody(registerSchema), register);
