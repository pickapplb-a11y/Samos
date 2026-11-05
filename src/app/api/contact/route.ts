import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { handle, HttpError, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  if (!(await rateLimit("contact", 5, 60 * 60_000))) throw new HttpError(429, "Too many messages — please try again later");
  const body = await req.json();
  if (body.website) return ok({ ok: true }); // honeypot
  const data = z
    .object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(120), subject: z.string().trim().min(2).max(120), message: z.string().trim().min(10).max(4000) })
    .parse(body);
  await db.contactMessage.create({ data });
  return ok({ ok: true });
});
