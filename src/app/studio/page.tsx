import type { Metadata } from "next";
import "@fontsource/bebas-neue";
import "@fontsource/archivo-black";
import "@fontsource/oswald";
import "@fontsource/space-mono";
import "@fontsource/playfair-display";
import "@fontsource/permanent-marker";
import "@fontsource/pacifico";
import "@fontsource/unifrakturmaguntia";
import Studio from "@/components/studio/Studio";
import { db } from "@/lib/db";
import { currentUser, guestId as getGuest } from "@/lib/auth";
import { findOwnedDesign } from "@/lib/designs";
import { features, getPricing } from "@/lib/settings";
import type { Layer } from "@/lib/design/schema";
import type { AssetMeta } from "@/components/studio/store";

export const metadata: Metadata = {
  title: "3D Design Studio",
  description: "Design your own hoodie in real-time 3D. Upload artwork, add text, place it front, back or on the sleeves, and see the exact print before you order.",
  alternates: { canonical: "/studio" },
};

const meta = (a: { id: string; width: number | null; height: number | null; mime: string; meta: unknown }): AssetMeta => ({
  id: a.id,
  url: `/api/assets/${a.id}`,
  width: a.width ?? 1000,
  height: a.height ?? 1000,
  mime: a.mime,
  name: (a.meta as { name?: string; originalName?: string } | null)?.name ?? (a.meta as { originalName?: string } | null)?.originalName,
});

export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [user, pricing, libraryRows] = await Promise.all([
    currentUser(),
    getPricing(),
    db.asset.findMany({ where: { meta: { path: ["library"], equals: true } }, orderBy: { createdAt: "asc" } }),
  ]);
  const library = libraryRows.map(meta);
  let initial: React.ComponentProps<typeof Studio>["initial"] = {};

  const loadAssets = async (layers: Layer[]) => {
    const ids = layers.filter((l) => l.type === "image").map((l) => (l as Extract<Layer, { type: "image" }>).assetId);
    if (!ids.length) return [];
    return (await db.asset.findMany({ where: { id: { in: ids } } })).map(meta);
  };

  if (sp.design) {
    const d = await findOwnedDesign(sp.design, user, await getGuest(false));
    if (d) {
      const layers = d.layers as unknown as Layer[];
      const prod = d.productId ? await db.product.findUnique({ where: { id: d.productId }, include: { colors: { orderBy: { position: "asc" } } } }) : null;
      initial = {
        designId: d.id, name: d.name, style: d.style, colorHex: d.colorHex, colorName: d.colorName, layers, productId: d.productId, assets: await loadAssets(layers),
        ...(prod ? { baseOverride: prod.basePrice, colors: prod.colors.map((c) => ({ name: c.name, hex: c.hex })) } : {}),
      };
    }
  } else if (sp.remix) {
    // Start from a public showcase design (copy — the original is never modified).
    const d = await db.design.findFirst({ where: { id: sp.remix, isPublic: true } });
    if (d) {
      const layers = d.layers as unknown as Layer[];
      initial = { name: `${d.name} (remix)`, style: d.style, colorHex: d.colorHex, colorName: d.colorName, layers, assets: await loadAssets(layers) };
    }
  }
  const slug = sp.product;
  if (slug) {
    const p = await db.product.findFirst({ where: { slug, active: true, customizable: true }, include: { colors: { orderBy: { position: "asc" } } } });
    if (p) {
      const color = p.colors.find((c) => c.hex.toLowerCase() === `#${(sp.color ?? "").toLowerCase()}`) ?? p.colors[0];
      initial = {
        ...initial,
        name: initial.name ?? p.name,
        style: initial.style ?? p.style,
        productId: p.id,
        baseOverride: p.basePrice,
        colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
        colorHex: initial.colorHex ?? color?.hex,
        colorName: initial.colorName ?? color?.name,
      };
    }
  }
  return <Studio pricing={pricing} aiEnabled={features.ai()} signedIn={!!user} library={library} initial={initial} />;
}
