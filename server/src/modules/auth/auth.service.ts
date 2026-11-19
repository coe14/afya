import { User, type UserDocument } from "../../models";
import { ApiError } from "../../utils/ApiError";
import type { RegisterInput } from "./auth.schema";

/**
 * Creates a new user account.
 *
 * `input` must already be validated by registerSchema (the controller's job).
 * Returns the saved user; its toJSON() hides the password hash and other secrets.
 */
export async function registerUser(
  input: RegisterInput,
): Promise<UserDocument> {
  // Keep the plain password separate from the rest of the profile data.
  const { password, ...profile } = input;

  // 1. Friendly duplicate checks (the unique indexes are the final safety net).
  if (await User.exists({ email: profile.email })) {
    throw ApiError.conflict("An account with this email already exists", {
      field: "email",
    });
  }
  if (profile.phone && (await User.exists({ phone: profile.phone }))) {
    throw ApiError.conflict(
      "An account with this phone number already exists",
      { field: "phone" },
    );
  }

  // 2. Build the user in memory, hash the password, then save.
  const user = new User(profile);
  await user.setPassword(password);
  await user.save();

  return user;
}
