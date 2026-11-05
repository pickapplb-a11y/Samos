import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";

/** Can this requester read the asset? Owner, same guest browser, admin, or it belongs to one of the user's orders. */
export async function canReadAsset(assetId: string, user: CurrentUser | null, guestId: string | null) {
  const a = await db.asset.findUnique({ where: { id: assetId } });
  if (!a) return null;
  if ((a.meta as { library?: boolean } | null)?.library) return a;
  if (user?.role === "ADMIN") return a;
  if (user && a.ownerId === user.id) return a;
  if (!a.ownerId && guestId && a.guestId === guestId) return a;
  // Public showcase designs expose their preview and source images.
  const pub = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Design" WHERE "isPublic" = true AND ("previewId" = ${assetId} OR layers::text LIKE ${"%\"" + assetId + "\"%"}) LIMIT 1`;
  if (pub.length) return a;
  return null;
}

/** Assets referenced by a set of layers that the requester is allowed to use. */
export async function assertLayerAssets(assetIds: string[], user: CurrentUser | null, guestId: string | null) {
  const unique = [...new Set(assetIds)];
  for (const id of unique) {
    const a = await canReadAsset(id, user, guestId);
    if (!a || (a.kind !== "UPLOAD" && a.kind !== "AI")) return false;
  }
  return true;
}
