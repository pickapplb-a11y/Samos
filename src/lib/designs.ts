import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { designInputSchema, type Layer } from "./design/schema";
import { isInside } from "./design/geometry";
import { zoneUnits, type ZoneId } from "./design/zones";
import { assertLayerAssets } from "./assets";
import { HttpError } from "./http";

export async function findOwnedDesign(id: string, user: CurrentUser | null, guestId: string | null, allowAdmin = false) {
  const d = await db.design.findUnique({ where: { id } });
  if (!d) return null;
  if (user && d.userId === user.id) return d;
  if (!d.userId && guestId && d.guestId === guestId) return d;
  if (allowAdmin && user?.role === "ADMIN") return d;
  return null;
}

/** Full server-side validation of a design: schema, fonts, print boundaries, asset ownership. */
export async function validateDesign(raw: unknown, user: CurrentUser | null, guestId: string | null) {
  const input = designInputSchema.parse(raw);
  for (const l of input.layers) {
    const { w, h } = zoneUnits(input.style, l.zone as ZoneId);
    if (!isInside(l as Layer, w, h, 2)) throw new HttpError(422, `"${l.name ?? l.type}" extends outside the printable area`);
  }
  const ids = new Set(input.layers.map((l) => l.id));
  if (ids.size !== input.layers.length) throw new HttpError(422, "Duplicate layer ids");
  const assetIds = input.layers.filter((l) => l.type === "image").map((l) => (l as Extract<Layer, { type: "image" }>).assetId);
  if (!(await assertLayerAssets(assetIds, user, guestId))) throw new HttpError(403, "One of the images is not available to you");
  if (input.productId) {
    // A product-based design must keep that product's style and one of its colours; otherwise it becomes a plain studio design (studio pricing).
    const p = await db.product.findFirst({ where: { id: input.productId, active: true, customizable: true }, include: { colors: true } });
    if (!p || p.style !== input.style || !p.colors.some((c) => c.hex.toLowerCase() === input.colorHex.toLowerCase())) input.productId = null;
  }
  return input;
}
