import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, startSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { handle, HttpError, ok } from "@/lib/http";

const DUMMY = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5rG8bSp5oQ2b0bJbZz1Z5xWQnOLSa1e";

export const POST = handle(async (req: Request) => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) }).parse(await req.json());
  // Per-IP and per-account throttling against credential stuffing.
  if (!(await rateLimit("login-ip", 20, 15 * 60_000)) || !(await rateLimit("login-acct", 8, 15 * 60_000, email))) throw new HttpError(429, "Too many attempts. Please wait 15 minutes.");
  const user = await db.user.findUnique({ where: { email } });
  const valid = await checkPassword(password, user?.passwordHash ?? DUMMY); // constant-ish time
  if (!user || !valid) throw new HttpError(401, "Incorrect email or password");
  await startSession(user);
  return ok({ ok: true, role: user.role });
});
