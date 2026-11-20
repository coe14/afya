import bcrypt from 'bcryptjs';
import { User, type UserDocument } from '../../models';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken } from '../../utils/tokens';
import type { LoginInput, RegisterInput } from './auth.schema';

/* ────────────────────────────────────────────────────────────
 * Registration
 * ──────────────────────────────────────────────────────────── */

/**
 * Creates a new user account.
 *
 * `input` must already be validated by registerSchema (the controller's job).
 * Returns the saved user; its toJSON() hides the password hash and other secrets.
 */
export async function registerUser(input: RegisterInput): Promise<UserDocument> {
  // Keep the plain password separate from the rest of the profile data.
  const { password, ...profile } = input;

  // 1. Friendly duplicate checks (the unique indexes are the final safety net).
  if (await User.exists({ email: profile.email })) {
    throw ApiError.conflict('An account with this email already exists', { field: 'email' });
  }
  if (profile.phone && (await User.exists({ phone: profile.phone }))) {
    throw ApiError.conflict('An account with this phone number already exists', { field: 'phone' });
  }

  // 2. Build the user in memory, hash the password, then save.
  const user = new User(profile);
  await user.setPassword(password);
  await user.save();

  return user;
}

/* ────────────────────────────────────────────────────────────
 * Login
 * ──────────────────────────────────────────────────────────── */

// A real bcrypt hash of a throwaway password, created once at startup.
// Used to spend the same time on "unknown email" as on "wrong password".
// (12 matches BCRYPT_ROUNDS in user.model.ts.)
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password', 12);

export interface LoginResult {
  user: UserDocument;
  accessToken: string;
}

/**
 * Checks an email and password and, if correct, returns the user and an access token.
 *
 * `input` must already be validated by loginSchema (the controller's job).
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const { email, password } = input;

  // passwordHash is hidden by default (select: false), so we ask for it explicitly.
  const user = await User.findOne({ email }).select('+passwordHash');

  // Always run one bcrypt comparison, even when the email is unknown,
  // so response time does not reveal which emails are registered.
  const passwordMatches = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

  // One identical error for: unknown email, wrong password, and deactivated account.
  if (!user || !passwordMatches || user.status === 'deactivated') {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Only someone who proved they know the password is told their account is suspended.
  if (user.status === 'suspended') {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Please contact support.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken({ id: user.id, role: user.role });

  return { user, accessToken };
}