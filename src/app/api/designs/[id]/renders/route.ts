import sharp from "sharp";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { ownerScope } from "@/lib/auth";
import { findOwnedDesign } from "@/lib/designs";
import { putObject } from "@/lib/storage";
import { storeImage } from "@/lib/uploads";
import { handle, HttpError, ok } from "@/lib/http";
import { PRINT_DPI, UNITS_PER_INCH, ZONE_IDS, zoneUnits, type ZoneId } from "@/lib/design/zones";
import type { Layer } from "@/lib/design/schema";

const MAX_PRINT_BYTES = 40 * 1024 * 1024;

/** Accepts the 300 DPI print files rendered in the studio for the design's current revision. */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user, guestId } = await ownerScope();
  const d = await findOwnedDesign((await params).id, user, guestId);
  if (!d) throw new HttpError(404, "Design not found");
  const form = await req.formData();
  if (Number(form.get("revision")) !== d.revision) throw new HttpError(409, "Design changed while saving — please try again");

  const layers = d.layers as unknown as Layer[];
  const used = new Set(layers.filter((l) => l.visible !== false).map((l) => l.zone as ZoneId));
  const renders: Partial<Record<ZoneId, string>> = {};
  for (const zone of ZONE_IDS) {
    const f = form.get(zone);
    if (!used.has(zone)) continue;
    if (!(f instanceof File)) throw new HttpError(422, `Missing print file for ${zone}`);
    if (f.size > MAX_PRINT_BYTES) throw new HttpError(413, "Print file too large");
    const buf = Buffer.from(await f.arrayBuffer());
    const meta = await sharp(buf).metadata().catch(() => null);
    const { w, h } = zoneUnits(d.style, zone);
    const ew = Math.round((w * PRINT_DPI) / UNITS_PER_INCH);
    const eh = Math.round((h * PRINT_DPI) / UNITS_PER_INCH);
    if (meta?.format !== "png" || meta.width !== ew || meta.height !== eh) throw new HttpError(422, `Print file for ${zone} must be a ${ew}×${eh} PNG`);
    // Embed the 300 DPI density so print RIP software sizes it correctly.
    const out = await sharp(buf).withMetadata({ density: PRINT_DPI }).png().toBuffer();
    const key = `print/${d.id}/r${d.revision}-${zone}-${randomBytes(6).toString("hex")}.png`;
    await putObject(key, out, "image/png");
    const a = await db.asset.create({
      data: { key, kind: "PRINT", mime: "image/png", size: out.length, width: ew, height: eh, ownerId: d.userId, guestId: d.userId ? null : d.guestId, meta: { designId: d.id, revision: d.revision, zone, dpi: PRINT_DPI } },
    });
    renders[zone] = a.id;
  }
  let previewId: string | null = null;
  const pv = form.get("preview");
  if (pv instanceof File && pv.size < 8 * 1024 * 1024) {
    const a = await storeImage({ data: Buffer.from(await pv.arrayBuffer()), kind: "PREVIEW", ownerId: d.userId, guestId: d.guestId });
    previewId = a.id;
  }
  await db.design.update({ where: { id: d.id }, data: { renders, previewId } });
  return ok({ renders, previewId });
});
