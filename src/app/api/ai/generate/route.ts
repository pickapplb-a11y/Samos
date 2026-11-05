import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { features } from "@/lib/settings";
import { storeImage } from "@/lib/uploads";
import { handle, HttpError, ok } from "@/lib/http";

export const maxDuration = 90;

/** Only active when a real image-generation API is configured (OPENAI_API_KEY). */
export const POST = handle(async (req: Request) => {
  if (!features.ai()) throw new HttpError(404, "AI design assistant is not enabled");
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in to use the AI design assistant");
  if (!(await rateLimit("ai", 10, 60 * 60_000, user.id))) throw new HttpError(429, "You've reached the hourly limit of 10 generations");
  const { prompt } = z.object({ prompt: z.string().trim().min(4).max(400) }).parse(await req.json());

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: `Original apparel graphic for direct-to-garment printing on a hoodie: ${prompt}. Single centred artwork isolated on a fully transparent background. No garment, no mockup, no background scene, no frame. Bold, clean, high-contrast shapes suitable for print. Do not include real brand logos, trademarks or real people.`,
      size: "1024x1024",
      background: "transparent",
      output_format: "png",
      quality: "high",
      n: 1,
      user: user.id,
    }),
    signal: AbortSignal.timeout(85_000),
  }).catch(() => null);
  if (!r) throw new HttpError(504, "The image service timed out — please try again");
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.code === "moderation_blocked" ? "That prompt can't be generated. Try describing it differently." : "The image service couldn't create that graphic";
    throw new HttpError(r.status === 400 ? 422 : 502, msg);
  }
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) throw new HttpError(502, "No image returned");
  const asset = await storeImage({ data: Buffer.from(b64, "base64"), kind: "AI", ownerId: user.id, meta: { prompt, originalName: "AI graphic" } });
  return ok({ asset: { id: asset.id, url: `/api/assets/${asset.id}`, width: asset.width, height: asset.height, mime: asset.mime } }, { status: 201 });
});
