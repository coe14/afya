import { User, type UserDocument } from "../../models";
import { ApiError } from "../../utils/ApiError";

/**
 * Loads the account for a user id taken from a verified token.
 *
 * Access tokens stay valid until they expire, so we re-check the account
 * here: it may have been suspended or deactivated since the token was issued.
 */
export async function getCurrentUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId);

  if (!user || user.status === "deactivated") {
    throw ApiError.unauthorized("Account not found");
  }
  if (user.status === "suspended") {
    throw new ApiError(
      403,
      "ACCOUNT_SUSPENDED",
      "Your account has been suspended. Please contact support.",
    );
  }

  return user;
}
