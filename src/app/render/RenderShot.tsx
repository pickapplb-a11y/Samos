"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Layer } from "@/lib/design/schema";
import type { Style } from "@/lib/design/zones";
import { useZoneTextures, loadFonts, preloadImage } from "@/components/studio/zoneCanvas";
import { normalizeTextLayers } from "@/lib/design/render";

const HoodieStage = dynamic(() => import("@/components/hoodie/HoodieStage"), { ssr: false });

export default function RenderShot({ style, color, layers, azimuth, background }: { style: Style; color: string; layers: Layer[]; azimuth: number; background: string }) {
  const [ready, setReady] = useState<Layer[] | null>(null);
  useEffect(() => {
    Promise.all([loadFonts(), ...layers.filter((l) => l.type === "image").map((l) => preloadImage((l as Extract<Layer, { type: "image" }>).assetId))]).then(() => {
      setReady(normalizeTextLayers(layers));
      setTimeout(() => ((window as unknown as { __shotReady: boolean }).__shotReady = true), 2500);
    });
  }, [layers]);
  const textures = useZoneTextures({ style, layers: ready ?? [], guides: false });
  return (
    <div className="h-dvh w-full" style={{ background }}>
      {ready && <HoodieStage style={style} color={color} zoneTextures={textures} view={{ azimuth, nonce: 1 }} zoom={1.12} interactive={false} background={background} preserveDrawingBuffer />}
    </div>
  );
}
