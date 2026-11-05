"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Layer } from "@/lib/design/schema";
import type { Style } from "@/lib/design/zones";
import { canUse3D } from "@/lib/webgl";

const HeroLive = dynamic(() => import("./HeroLive"), { ssr: false });

/** Hero: a poster image paints instantly; the real-time 3D hoodie loads when the browser is idle. */
export default function HeroHoodie({ style, color, layers, poster }: { style: Style; color: string; layers: Layer[]; poster: string }) {
  const [ready, setReady] = useState<Layer[] | null>(null);
  useEffect(() => {
    if (!canUse3D() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = async () => {
      const [{ loadFonts, preloadImage }, { normalizeTextLayers }] = await Promise.all([import("@/components/studio/zoneCanvas"), import("@/lib/design/render")]);
      await Promise.all([loadFonts(), ...layers.filter((l) => l.type === "image").map((l) => preloadImage((l as Extract<Layer, { type: "image" }>).assetId))]);
      setReady(normalizeTextLayers(layers));
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void start());
    else setTimeout(() => void start(), 300);
  }, [layers]);
  return (
    <div className="absolute inset-0">
      <Image src={poster} alt="VANTA heavyweight hoodie" fill priority sizes="100vw" className={`object-contain object-center transition-opacity duration-1000 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] ${ready ? "opacity-0" : "opacity-100"}`} />
      {ready && <div className="absolute inset-0 animate-fadeIn [animation-duration:1.2s]"><HeroLive style={style} color={color} layers={ready} /></div>}
    </div>
  );
}
