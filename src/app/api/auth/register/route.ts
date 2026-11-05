import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, startSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { handle, HttpError, ok } from "@/lib/http";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Use letters and at least one number");

export const POST = handle(async (req: Request) => {
  if (!(await rateLimit("register", 5, 60 * 60_000))) throw new HttpError(429, "Too many sign-ups from this network. Try again later.");
  const data = z
    .object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(120), password: passwordSchema })
    .parse(await req.json());
  if (await db.user.findUnique({ where: { email: data.email } })) throw new HttpError(409, "An account with this email already exists");
  const user = await db.user.create({ data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) } });
  await startSession(user);
  return ok({ ok: true }, { status: 201 });
});
