"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Layer } from "@/lib/design/schema";
import { ZONE_IDS, type Style, type ZoneId } from "@/lib/design/zones";
import { useZoneTextures, loadFonts, preloadImage } from "@/components/studio/zoneCanvas";
import { VIEW_AZIMUTH } from "@/components/hoodie/viewConstants";

const HoodieStage = dynamic(() => import("@/components/hoodie/HoodieStage"), { ssr: false });

/** Interactive 3D view of the exact frozen design the customer approved. */
export default function DesignViewer({ style, color, layers }: { style: Style; color: string; layers: Layer[] }) {
  const [ready, setReady] = useState<Layer[] | null>(null);
  const [view, setView] = useState({ azimuth: 0, nonce: 0 });
  useEffect(() => {
    Promise.all([loadFonts(), ...layers.filter((l) => l.type === "image").map((l) => preloadImage((l as Extract<Layer, { type: "image" }>).assetId))]).then(() => setReady(layers));
  }, [layers]);
  const textures = useZoneTextures({ style, layers: ready ?? [], guides: false });
  const used = new Set(layers.map((l) => l.zone as ZoneId));
  return (
    <div className="relative h-full w-full">
      {ready ? <HoodieStage style={style} color={color} zoneTextures={textures} view={view} /> : <div className="grid h-full place-items-center text-xs text-mist">Loading 3D…</div>}
      <div className="absolute inset-x-2 bottom-2 flex flex-wrap justify-center gap-1">
        {ZONE_IDS.filter((z) => used.has(z)).map((z) => <button key={z} className="chip h-7 bg-ink/70 text-[10px]" onClick={() => setView((v) => ({ azimuth: VIEW_AZIMUTH[z], nonce: v.nonce + 1 }))}>{z.replace("Sleeve", " sleeve")}</button>)}
      </div>
    </div>
  );
}
