import { db } from "@/lib/db";
import { ownerScope } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { storeImage, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { handle, HttpError, ok } from "@/lib/http";

const toMeta = (a: { id: string; width: number | null; height: number | null; mime: string }) => ({ id: a.id, url: `/api/assets/${a.id}`, width: a.width ?? 1000, height: a.height ?? 1000, mime: a.mime });

export const POST = handle(async (req: Request) => {
  const { user, guestId } = await ownerScope();
  if (!(await rateLimit("upload", 30, 10 * 60_000, user?.id ?? guestId ?? undefined))) throw new HttpError(429, "Too many uploads. Please wait a few minutes.");
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_UPLOAD_BYTES + 1024 * 64) throw new HttpError(413, "File too large (max 15 MB)");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file provided");
  const data = Buffer.from(await file.arrayBuffer());
  const asset = await storeImage({ data, kind: "UPLOAD", ownerId: user?.id, guestId, allowSvg: true, meta: { originalName: file.name.slice(0, 120) } });
  return ok({ asset: toMeta(asset) }, { status: 201 });
});

export const GET = handle(async () => {
  const { user, guestId } = await ownerScope();
  if (!user && !guestId) return ok({ assets: [] });
  const assets = await db.asset.findMany({
    where: { kind: { in: ["UPLOAD", "AI"] }, ...(user ? { ownerId: user.id } : { guestId, ownerId: null }) },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return ok({ assets: assets.map((a) => ({ ...toMeta(a), name: (a.meta as { originalName?: string } | null)?.originalName })) });
});
