import type { RequestHandler } from 'express';
import type { RegisterInput } from './auth.schema';
import { registerUser } from './auth.service';

// POST /api/v1/auth/register
export const register: RequestHandler = async (req, res) => {
  // validateBody(registerSchema) already checked and cleaned this data.
  const input: RegisterInput = req.body;

  const user = await registerUser(input);

  res.status(201).json({ data: { user } });
};