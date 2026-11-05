import { notFound } from "next/navigation";
import "@fontsource/bebas-neue";
import "@fontsource/archivo-black";
import "@fontsource/oswald";
import "@fontsource/space-mono";
import "@fontsource/pacifico";
import "@fontsource/unifrakturmaguntia";
import { db } from "@/lib/db";
import RenderShot from "./RenderShot";
import type { Layer } from "@/lib/design/schema";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Internal photo booth used by scripts/render-shots.mjs to generate product photography from the 3D model. */
export default async function RenderPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_RENDER_ROUTE !== "1") notFound();
  const sp = await searchParams;
  let layers: Layer[] = [];
  let style = (sp.style as "OVERSIZED" | "REGULAR" | "ZIP") ?? "OVERSIZED";
  let color = sp.c ? `#${sp.c}` : "#111111";
  if (sp.design) {
    const d = await db.design.findFirst({ where: { id: sp.design, isPublic: true } });
    if (d) {
      layers = d.layers as unknown as Layer[];
      style = d.style;
      if (!sp.c) color = d.colorHex;
    }
  }
  return <RenderShot style={style} color={color} layers={layers} azimuth={Number(sp.az ?? 0)} background={sp.bg ? `#${sp.bg}` : "#141414"} />;
}
