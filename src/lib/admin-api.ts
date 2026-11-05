import "server-only";
import { currentUser } from "./auth";
import { HttpError } from "./http";

/** API-route guard: re-checks the role in the database (never trusts the cookie alone). */
export async function requireAdminApi() {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") throw new HttpError(403, "Forbidden");
  return u;
}
