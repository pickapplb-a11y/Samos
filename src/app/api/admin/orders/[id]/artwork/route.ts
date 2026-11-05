import { zipSync, strToU8 } from "fflate";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-api";
import { getObject } from "@/lib/storage";
import { handle, HttpError } from "@/lib/http";
import type { Layer } from "@/lib/design/schema";

/** Everything production needs for one order: 300 DPI print PNGs, original uploads and a JSON spec sheet. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdminApi();
  const o = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!o) throw new HttpError(404, "Order not found");
  const files: Record<string, Uint8Array> = {};
  const spec: unknown[] = [];
  for (const [n, it] of o.items.entries()) {
    const folder = `${String(n + 1).padStart(2, "0")}-${it.name.replace(/[^\w-]+/g, "_").slice(0, 40)}-${it.size}-x${it.quantity}`;
    const prints = (it.printFiles ?? {}) as Record<string, string>;
    const d = it.design as { layers?: Layer[] } | null;
    for (const [zone, id] of Object.entries(prints)) {
      const a = await db.asset.findUnique({ where: { id } });
      if (a) files[`${folder}/print-${zone}-300dpi.png`] = new Uint8Array(await getObject(a.key));
    }
    for (const l of d?.layers ?? []) {
      if (l.type !== "image") continue;
      const a = await db.asset.findUnique({ where: { id: l.assetId } });
      if (a) files[`${folder}/sources/${l.id}.${a.mime === "image/svg+xml" ? "svg" : a.mime === "image/png" ? "png" : "jpg"}`] = new Uint8Array(await getObject(a.key));
    }
    spec.push({ item: n + 1, name: it.name, style: it.style, size: it.size, quantity: it.quantity, garmentColor: { name: it.colorName, hex: it.colorHex }, design: it.design ?? null });
  }
  files["order.json"] = strToU8(JSON.stringify({ order: o.number, placed: o.createdAt, shipping: o.shipping, items: spec }, null, 2));
  const zip = zipSync(files, { level: 0 });
  return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${o.number}-artwork.zip"`, "Cache-Control": "private, no-store" } });
});
