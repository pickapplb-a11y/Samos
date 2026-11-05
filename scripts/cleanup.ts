/* Retention job (run daily, e.g. cron): removes guest designs and guest uploads older than 90 days
   that are not part of any order. Usage: npm run cleanup */
import { PrismaClient } from "@prisma/client";
import { deleteObject } from "../src/lib/storage";

const db = new PrismaClient();
const cutoff = new Date(Date.now() - 90 * 86400000);

async function main() {
  const orderRefs = new Set<string>();
  for (const it of await db.orderItem.findMany({ select: { previewId: true, printFiles: true, design: true, designId: true } })) {
    if (it.previewId) orderRefs.add(it.previewId);
    if (it.designId) orderRefs.add(it.designId);
    for (const id of Object.values((it.printFiles ?? {}) as Record<string, string>)) orderRefs.add(id);
    for (const l of ((it.design as { layers?: { assetId?: string }[] } | null)?.layers ?? [])) if (l.assetId) orderRefs.add(l.assetId);
  }
  const designs = await db.design.findMany({ where: { userId: null, isPublic: false, updatedAt: { lt: cutoff } }, select: { id: true } });
  const delDesigns = designs.filter((d) => !orderRefs.has(d.id)).map((d) => d.id);
  await db.design.deleteMany({ where: { id: { in: delDesigns } } });

  const assets = await db.asset.findMany({ where: { ownerId: null, guestId: { not: null }, createdAt: { lt: cutoff } } });
  let removed = 0;
  for (const a of assets) {
    if (orderRefs.has(a.id) || (a.meta as { library?: boolean } | null)?.library) continue;
    await deleteObject(a.key);
    await db.asset.delete({ where: { id: a.id } });
    removed++;
  }
  console.log(`Removed ${delDesigns.length} guest designs and ${removed} guest files older than 90 days.`);
}
main().finally(() => db.$disconnect());
