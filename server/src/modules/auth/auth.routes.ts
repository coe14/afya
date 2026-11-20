import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import { login, register } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

export const authRouter = Router();

// POST /api/v1/auth/register
authRouter.post('/register', validateBody(registerSchema), register);

// POST /api/v1/auth/login
authRouter.post('/login', validateBody(loginSchema), login);