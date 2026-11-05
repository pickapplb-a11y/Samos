"use client";

import HoodieStage from "@/components/hoodie/HoodieStage";
import { useZoneTextures } from "@/components/studio/zoneCanvas";
import type { Layer } from "@/lib/design/schema";
import type { Style } from "@/lib/design/zones";

/** Loaded on demand: Three.js only ships once the hero goes live. */
export default function HeroLive({ style, color, layers }: { style: Style; color: string; layers: Layer[] }) {
  const textures = useZoneTextures({ style, layers, guides: false });
  return <HoodieStage style={style} color={color} zoneTextures={textures} autoRotate interactive={false} view={{ azimuth: Math.PI * 0.85, nonce: 1 }} zoom={1.05} />;
}
