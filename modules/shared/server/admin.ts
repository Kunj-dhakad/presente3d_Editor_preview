import { ApiError, requireUser } from "./api";
import { isAdminEmail } from "./account";

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (!isAdminEmail(user.email)) throw new ApiError(404, "Not found.");
  return user;
}
