import { currentUser, guestId as getGuest } from "@/lib/auth";
import { canReadAsset } from "@/lib/assets";
import { getObject } from "@/lib/storage";
import { fail } from "@/lib/http";
import { db } from "@/lib/db";

// Private asset delivery: every request is authorised (owner, same guest browser, admin, or public showcase/library).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const gid = await getGuest(false);
  const url = new URL(req.url);
  let a = await canReadAsset(id, user, gid);
  // Guest order pages: ?o=<order number>&t=<access token> unlocks that order's own preview image.
  const o = url.searchParams.get("o");
  const t = url.searchParams.get("t");
  if (!a && o && t) {
    const order = await db.order.findFirst({ where: { number: o, accessToken: t }, include: { items: { select: { previewId: true } } } });
    if (order?.items.some((i) => i.previewId === id)) a = await db.asset.findUnique({ where: { id } });
  }
  if (!a) return fail(404, "Not found");
  const body = await getObject(a.key).catch(() => null);
  if (!body) return fail(404, "Not found");
  const download = url.searchParams.get("download");
  const headers: Record<string, string> = {
    "Content-Type": a.mime,
    "Cache-Control": (a.meta as { library?: boolean } | null)?.library ? "public, max-age=86400" : "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    // SVGs are sanitised on upload; this CSP is a second layer if one is opened directly.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="${download.replace(/[^\w.-]/g, "_")}"`;
  return new Response(new Uint8Array(body), { headers });
}
