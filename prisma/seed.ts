/* Seed: catalog, inventory, library graphics, showcase designs, reviews, discounts, admin user.
   Run with: npm run db:seed   (uses --conditions=react-server so server-only modules load) */
import { PrismaClient, type HoodieStyle } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { storeImage } from "../src/lib/uploads";
import { DEFAULT_PRICING } from "../src/lib/design/pricing";

const db = new PrismaClient();
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const C = {
  black: { name: "Jet Black", hex: "#111111" },
  bone: { name: "Bone", hex: "#E9E3D5" },
  heather: { name: "Heather Grey", hex: "#9A9A9A" },
  charcoal: { name: "Charcoal", hex: "#3A3A3C" },
  navy: { name: "Navy", hex: "#1C2440" },
  forest: { name: "Forest", hex: "#24382B" },
  burgundy: { name: "Burgundy", hex: "#5A1F2B" },
  blaze: { name: "Blaze", hex: "#FF6B00" },
  sand: { name: "Sand", hex: "#C8B597" },
  sky: { name: "Sky", hex: "#9DB8D4" },
  lilac: { name: "Lilac", hex: "#B9A8CF" },
  offwhite: { name: "Off White", hex: "#F4F2EC" },
};
type Col = (typeof C)[keyof typeof C];

const MATERIAL = {
  heavy: "480 GSM brushed-back cotton fleece (80% organic cotton, 20% recycled polyester). Pre-shrunk, garment-dyed, with 2×2 ribbed cuffs and hem.",
  mid: "380 GSM loopback French terry, 100% combed ring-spun cotton. Enzyme-washed for a soft, broken-in hand feel.",
  zip: "420 GSM cotton-rich fleece with a YKK® metal two-way zipper, double-layer hood and split kangaroo pockets.",
};
const CARE = "Machine wash cold, inside out, with similar colours. Do not bleach. Tumble dry low or hang dry. Do not iron directly on the print. Do not dry clean.";
const FIT = {
  OVERSIZED: "Oversized, boxy fit with dropped shoulders and a slightly cropped body. Take your usual size for the intended oversized look, or size down for a closer fit.",
  REGULAR: "Classic regular fit, true to size. Size up for a relaxed look.",
  ZIP: "Regular fit with a slightly longer body. True to size.",
};

const img = (style: HoodieStyle, color: Col, slug?: string) => {
  const base = `${slug ?? style.toLowerCase()}-${color.hex.slice(1).toLowerCase()}`;
  return [`/products/${base}-front.webp`, `/products/${base}-back.webp`, `/products/${base}-side.webp`];
};

async function main() {
  console.log("Seeding…");
  await db.setting.upsert({ where: { key: "pricing" }, update: {}, create: { key: "pricing", value: DEFAULT_PRICING as object } });

  // ---------- admin ----------
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@vanta.local").toLowerCase();
  const pw = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";
  await db.user.upsert({ where: { email }, update: { role: "ADMIN" }, create: { email, name: "Studio Admin", role: "ADMIN", passwordHash: await bcrypt.hash(pw, 12) } });
  const demo = await db.user.upsert({ where: { email: "demo@vanta.local" }, update: {}, create: { email: "demo@vanta.local", name: "Demo Customer", passwordHash: await bcrypt.hash("Demo!2026pass", 12) } });

  // ---------- library graphics ----------
  const lib: Record<string, string> = {};
  const dir = path.join(__dirname, "library");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".svg"))) {
    const name = f.replace(".svg", "");
    const existing = await db.asset.findFirst({ where: { AND: [{ meta: { path: ["library"], equals: true } }, { meta: { path: ["name"], equals: name } }] } });
    lib[name] = existing?.id ?? (await storeImage({ data: readFileSync(path.join(dir, f)), kind: "UPLOAD", allowSvg: true, meta: { library: true, name } })).id;
  }

  // ---------- categories & products ----------
  const cats = Object.fromEntries(
    await Promise.all(
      [["essentials", "Essentials"], ["graphic", "Graphic"], ["zip-ups", "Zip-ups"], ["limited", "Limited drops"]].map(async ([slug, name]) => [slug, (await db.category.upsert({ where: { slug }, update: { name }, create: { slug, name } })).id]),
    ),
  );

  const products: { slug: string; name: string; tagline: string; description: string; style: HoodieStyle; price: number; compareAt?: number; cat: string; colors: Col[]; material: string; featured?: boolean; popularity: number; imgSlug?: string }[] = [
    { slug: "monolith-oversized-hoodie", name: "Monolith Oversized Hoodie", tagline: "The heavyweight everyday", description: "Our signature 480 GSM heavyweight with a boxy, dropped-shoulder silhouette. Dense brushed fleece that holds its shape wash after wash — the perfect blank canvas for your own print.", style: "OVERSIZED", price: 8900, cat: "essentials", colors: [C.black, C.bone, C.charcoal, C.sand], material: MATERIAL.heavy, featured: true, popularity: 98 },
    { slug: "core-regular-hoodie", name: "Core Regular Hoodie", tagline: "Clean lines, true fit", description: "A refined regular-fit pullover in loopback French terry. Minimal branding, double-layer hood and flat drawcords.", style: "REGULAR", price: 6900, cat: "essentials", colors: [C.heather, C.black, C.navy, C.forest], material: MATERIAL.mid, popularity: 84 },
    { slug: "transit-zip-hoodie", name: "Transit Zip Hoodie", tagline: "Two-way zip, all-day layer", description: "A structured zip-up with a YKK® metal two-way zipper and split pockets. Left-chest and back print areas available.", style: "ZIP", price: 9500, cat: "zip-ups", colors: [C.black, C.charcoal, C.navy], material: MATERIAL.zip, featured: true, popularity: 77 },
    { slug: "afterhours-graphic-hoodie", name: "Afterhours Graphic Hoodie", tagline: "Moonlit back print", description: "Heavyweight oversized hoodie with our Afterhours moon artwork printed large across the back and a small chest wordmark.", style: "OVERSIZED", price: 10900, cat: "graphic", colors: [C.black, C.navy], material: MATERIAL.heavy, featured: true, popularity: 91, imgSlug: "afterhours" },
    { slug: "blaze-signal-hoodie", name: "Blaze Signal Hoodie", tagline: "Limited colourway", description: "Garment-dyed in our signature Blaze orange. Limited production run — once it's gone, it's gone.", style: "OVERSIZED", price: 9900, compareAt: 11900, cat: "limited", colors: [C.blaze, C.black], material: MATERIAL.heavy, featured: true, popularity: 88 },
    { slug: "studio-bone-hoodie", name: "Studio Bone Hoodie", tagline: "Soft neutral, sharp fit", description: "A regular-fit hoodie in warm, undyed tones. Pairs with everything and takes colour prints beautifully.", style: "REGULAR", price: 7500, cat: "essentials", colors: [C.bone, C.offwhite], material: MATERIAL.mid, popularity: 70 },
    { slug: "night-drive-zip", name: "Night Drive Zip", tagline: "Deep tones, metal hardware", description: "Our zip-up in rich burgundy and black, with a brushed interior and gunmetal hardware.", style: "ZIP", price: 10500, cat: "limited", colors: [C.burgundy, C.black], material: MATERIAL.zip, popularity: 66 },
    { slug: "racing-dept-hoodie", name: "Racing Dept. Hoodie", tagline: "Vintage motorsport", description: "Regular-fit hoodie with a vintage racing graphic on the back and chequered-flag chest detail.", style: "REGULAR", price: 9500, cat: "graphic", colors: [C.heather, C.navy], material: MATERIAL.mid, popularity: 80, imgSlug: "racing" },
    { slug: "haze-oversized-hoodie", name: "Haze Oversized Hoodie", tagline: "Washed pastels", description: "The Monolith silhouette in soft, washed pastel colourways.", style: "OVERSIZED", price: 8900, cat: "essentials", colors: [C.lilac, C.sky], material: MATERIAL.heavy, popularity: 62 },
    { slug: "blank-canvas-500", name: "Blank Canvas 500", tagline: "Every colour, ready to customise", description: "The studio blank in all twelve colours. Designed for customisation — bring your own artwork in the 3D studio.", style: "OVERSIZED", price: 7900, cat: "essentials", colors: Object.values(C), material: MATERIAL.heavy, popularity: 74 },
  ];

  const productIds: Record<string, string> = {};
  for (const p of products) {
    const images = p.colors.slice(0, 2).flatMap((c) => img(p.style, c, p.imgSlug));
    const data = {
      name: p.name, tagline: p.tagline, description: p.description, style: p.style, basePrice: p.price, compareAt: p.compareAt ?? null,
      material: p.material, fit: FIT[p.style], care: CARE, images, featured: !!p.featured, popularity: p.popularity, categoryId: cats[p.cat],
    };
    const prod = await db.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
    productIds[p.slug] = prod.id;
    await db.productColor.deleteMany({ where: { productId: prod.id } });
    await db.productColor.createMany({ data: p.colors.map((c, i) => ({ productId: prod.id, name: c.name, hex: c.hex, position: i })) });
    for (const c of p.colors)
      for (const s of SIZES) {
        const sku = `${p.slug.slice(0, 12).toUpperCase()}-${c.hex.slice(1)}-${s}`;
        await db.variant.upsert({ where: { sku }, update: {}, create: { productId: prod.id, colorHex: c.hex, size: s, sku, stock: s === "3XL" ? 6 : 20 + ((s.length * 7 + c.hex.charCodeAt(2)) % 30) } });
      }
  }

  // ---------- collections ----------
  const cols = [
    { slug: "heavyweights", title: "The Heavyweights", subtitle: "480 GSM. Built like outerwear.", image: "/products/oversized-111111-front.webp", products: ["monolith-oversized-hoodie", "blank-canvas-500", "afterhours-graphic-hoodie"] },
    { slug: "limited-drops", title: "Limited Drops", subtitle: "Small runs. No restocks.", image: "/products/oversized-ff6b00-front.webp", products: ["blaze-signal-hoodie", "night-drive-zip"] },
    { slug: "zip-season", title: "Zip Season", subtitle: "Layer up, print the back.", image: "/products/zip-1c2440-front.webp", products: ["transit-zip-hoodie", "night-drive-zip"] },
  ];
  for (const [i, c] of cols.entries()) {
    const col = await db.collection.upsert({ where: { slug: c.slug }, update: { title: c.title, subtitle: c.subtitle, image: c.image, position: i }, create: { slug: c.slug, title: c.title, subtitle: c.subtitle, image: c.image, position: i } });
    await db.collectionProduct.deleteMany({ where: { collectionId: col.id } });
    await db.collectionProduct.createMany({ data: c.products.map((s) => ({ collectionId: col.id, productId: productIds[s] })) });
  }

  // ---------- showcase designs (public, "customer-created") ----------
  // Text boxes of width/height 1 are measured precisely by the browser on first render.
  const T = (zone: string, text: string, fontFamily: string, fontSize: number, color: string, x: number, y: number, extra: Record<string, unknown> = {}) => ({ id: Math.random().toString(36).slice(2, 10), type: "text", zone, text, fontFamily, fontSize, color, x, y, width: 1, height: 1, rotation: 0, opacity: 1, locked: false, visible: true, letterSpacing: 0, align: "center", strokeWidth: 0, ...extra });
  const I = (zone: string, asset: string, x: number, y: number, w: number, h: number, rotation = 0) => ({ id: Math.random().toString(36).slice(2, 10), type: "image", zone, assetId: lib[asset], x, y, width: w, height: h, rotation, opacity: 1, locked: false, visible: true, flipX: false, name: asset });
  const showcase = [
    { key: "afterhours", name: "Afterhours", by: "Maya R.", style: "OVERSIZED" as const, color: C.black, layers: [I("back", "moon", 700, 640, 900, 900), T("back", "AFTERHOURS", "Anton", 230, "#F4F2EC", 700, 1330, { letterSpacing: 8 }), T("front", "AFTERHOURS", "Space Mono", 60, "#F4F2EC", 950, 220)] },
    { key: "racing", name: "Racing Dept.", by: "Jules K.", style: "REGULAR" as const, color: C.heather, layers: [I("back", "checker", 600, 420, 760, 500, -6), T("back", "RACING DEPT.", "Archivo Black", 140, "#C1121F", 600, 880, { strokeWidth: 6, strokeColor: "#FFFFFF" }), T("back", "EST. 2026 — TEAM VANTA", "Oswald", 60, "#0B0B0B", 600, 1030, { letterSpacing: 6 }), I("front", "checker", 820, 200, 230, 151)] },
    { key: "no-sleep", name: "No Sleep Club", by: "Theo A.", style: "OVERSIZED" as const, color: C.charcoal, layers: [T("front", "NO SLEEP", "Anton", 260, "#FF6B00", 600, 420), T("front", "CLUB", "Anton", 260, "#FFFFFF", 600, 700), I("leftSleeve", "star", 175, 300, 220, 220)] },
    { key: "hometown", name: "Hometown", by: "Ines B.", style: "OVERSIZED" as const, color: C.bone, layers: [T("back", "Hometown", "UnifrakturMaguntia", 270, "#0B0B0B", 700, 520), T("back", "FOREVER", "Oswald", 90, "#5A1F2B", 700, 760, { letterSpacing: 30 }), I("back", "rose", 700, 1150, 380, 532)] },
    { key: "sunset", name: "Sunset Wave", by: "Noah P.", style: "REGULAR" as const, color: C.sand, layers: [I("back", "sun", 600, 500, 900, 643), I("back", "wave", 600, 900, 900, 386), T("front", "Sunset", "Pacifico", 120, "#1C2440", 780, 220)] },
    { key: "eye", name: "Eye See You", by: "Ava L.", style: "OVERSIZED" as const, color: C.lilac, layers: [I("front", "eye", 600, 560, 900, 540), T("front", "WATCHING", "Bebas Neue", 150, "#0B0B0B", 600, 1050, { letterSpacing: 20 })] },
  ];
  for (const s of showcase) {
    const id = `showcase-${s.key}`;
    const data = { name: s.name, userId: demo.id, style: s.style, colorHex: s.color.hex, colorName: s.color.name, layers: s.layers as object[], isPublic: true };
    await db.design.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  // ---------- reviews ----------
  const reviews = [
    ["Maya R.", 5, "Heaviest hoodie I own", "The fleece is unreal — thick, soft and the print on the back is razor sharp. Looks exactly like the 3D preview."],
    ["Jules K.", 5, "Studio is addictive", "Spent an hour in the design studio. Dragging artwork onto the sleeve in 3D is so satisfying, and the final piece matched perfectly."],
    ["Theo A.", 4, "Great fit, runs big", "Love the boxy fit. I sized down one and it's perfect. Delivery took 6 days."],
    ["Ines B.", 5, "Gift that landed", "Designed one for my brother with our hometown name in blackletter. He hasn't taken it off."],
    ["Noah P.", 5, "Colours are rich", "The sand colour with the sunset print is beautiful in person. Ribbing is tight and holds its shape."],
    ["Ava L.", 4, "Premium feel", "Feels like a luxury piece. Wish there were more pastel shades, but lilac is gorgeous."],
  ] as const;
  if ((await db.review.count()) === 0) {
    const slugs = Object.keys(productIds);
    for (const [i, [name, rating, title, body]] of reviews.entries())
      for (const slug of [slugs[i % slugs.length], slugs[(i + 3) % slugs.length], slugs[(i + 6) % slugs.length]])
        await db.review.create({ data: { productId: productIds[slug], name, rating, title, body, verified: true, createdAt: new Date(Date.now() - (i + 1) * 86400000 * 4) } });
  }

  // ---------- discounts ----------
  for (const d of [
    { code: "WELCOME10", type: "PERCENT" as const, value: 10, minSubtotal: 0 },
    { code: "STUDIO20", type: "FIXED" as const, value: 2000, minSubtotal: 12000 },
  ])
    await db.discount.upsert({ where: { code: d.code }, update: {}, create: d });

  console.log(`Done. Admin: ${email} / ${pw}  ·  Demo customer: demo@vanta.local / Demo!2026pass`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
