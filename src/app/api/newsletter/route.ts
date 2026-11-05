import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { handle, HttpError, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  if (!(await rateLimit("newsletter", 5, 60 * 60_000))) throw new HttpError(429, "Too many requests");
  const { email } = z.object({ email: z.string().trim().toLowerCase().email().max(120) }).parse(await req.json());
  await db.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
  return ok({ ok: true });
});
