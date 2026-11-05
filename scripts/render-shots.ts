/* Generates product photography + showcase previews by photographing the real 3D model.
   Usage: (dev server running) npm run render:shots   — env BASE_URL defaults to http://localhost:3000 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { storeImage } from "../src/lib/uploads";

const db = new PrismaClient();
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.join(process.cwd(), "public/products");
const FORCE = process.argv.includes("--force");
const VIEWS = [["front", 0], ["back", Math.PI], ["side", 0.75]] as const;
const DESIGN_FOR: Record<string, string> = { afterhours: "showcase-afterhours", racing: "showcase-racing" };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const shoot = async (url: string) => {
    const page = await browser.newPage({ viewport: { width: 880, height: 1100 } });
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForFunction("window.__shotReady === true", null, { timeout: 120000 });
      // Read straight from the WebGL canvas (preserveDrawingBuffer) — avoids screenshot stalls under a busy render loop.
      const dataUrl = await page.evaluate(() => (document.querySelector("canvas") as HTMLCanvasElement).toDataURL("image/png"));
      return Buffer.from(dataUrl.split(",")[1], "base64");
    } finally {
      await page.close();
    }
  };

  // Every product image path referenced in the DB (and collection covers) -> render it.
  const products = await db.product.findMany({ select: { images: true, style: true } });
  const cols = await db.collection.findMany({ select: { image: true } });
  const wanted = new Map<string, string>();
  for (const p of products)
    for (const src of p.images) {
      const m = src.match(/^\/products\/([a-z]+)-([0-9a-f]{6})-(front|back|side)\.webp$/);
      if (!m) continue;
      const [, prefix, hex, view] = m;
      const style = prefix in DESIGN_FOR ? p.style : prefix.toUpperCase();
      const design = DESIGN_FOR[prefix];
      const az = VIEWS.find((v) => v[0] === view)![1];
      wanted.set(src, `${BASE}/render?style=${style}&c=${hex}&az=${az}${design ? `&design=${design}` : ""}`);
    }
  for (const c of cols) {
    const m = c.image.match(/^\/products\/([a-z]+)-([0-9a-f]{6})-(front|back|side)\.webp$/);
    if (m && !wanted.has(c.image)) wanted.set(c.image, `${BASE}/render?style=${m[1].toUpperCase()}&c=${m[2]}&az=${VIEWS.find((v) => v[0] === m[3])![1]}`);
  }
  let i = 0;
  for (const [src, url] of wanted) {
    const file = path.join(process.cwd(), "public", src);
    i++;
    if (existsSync(file) && !FORCE) continue;
    let png: Buffer | null = null;
    for (let tries = 0; tries < 3 && !png; tries++) png = await shoot(url).catch((e) => (console.warn(`retry ${src}: ${String(e).slice(0, 80)}`), null));
    if (!png) continue;
    await sharp(png).resize(880, 1100).webp({ quality: 86 }).toFile(file);
    console.log(`[${i}/${wanted.size}] ${src}`);
  }

  // Showcase previews (stored privately, exposed because the design is public).
  const showcase = await db.design.findMany({ where: { isPublic: true } });
  for (const d of showcase) {
    if (d.previewId && !FORCE) continue;
    const az = (d.layers as { zone: string }[]).some((l) => l.zone === "back") ? Math.PI : 0;
    const png = await shoot(`${BASE}/render?design=${d.id}&az=${az}`).catch(() => null);
    if (!png) continue;
    const a = await storeImage({ data: await sharp(png).resize(880, 1100).png().toBuffer(), kind: "PREVIEW", ownerId: d.userId });
    await db.design.update({ where: { id: d.id }, data: { previewId: a.id } });
    console.log(`showcase ${d.name}`);
  }
  await browser.close();
  await db.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
