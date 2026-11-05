"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { drawZone, type ImageSource } from "@/lib/design/render";
import type { Layer } from "@/lib/design/schema";
import { PRINT_DPI, UNITS_PER_INCH, ZONE_IDS, zoneUnits, FONT_FAMILIES, type Style, type ZoneId } from "@/lib/design/zones";
import { rotatedHalfExtents } from "@/lib/design/geometry";

// ---------- images ----------
const images = new Map<string, HTMLImageElement>();
const listeners = new Set<() => void>();
export function assetUrl(id: string) {
  return `/api/assets/${id}`;
}
export function getImage(id: string): ImageSource | undefined {
  const img = images.get(id);
  return img && img.complete && img.naturalWidth > 0 ? img : undefined;
}
export function preloadImage(id: string, src = assetUrl(id)) {
  if (images.has(id)) return images.get(id)!.decode().catch(() => undefined);
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  images.set(id, img);
  return img
    .decode()
    .then(() => listeners.forEach((f) => f()))
    .catch(() => undefined);
}
/** Re-render when images or fonts finish loading. */
export function useAssetVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((x) => x + 1);
    listeners.add(f);
    document.fonts?.addEventListener?.("loadingdone", f);
    return () => {
      listeners.delete(f);
      document.fonts?.removeEventListener?.("loadingdone", f);
    };
  }, []);
  return v;
}
export function loadFonts() {
  return Promise.all(FONT_FAMILIES.map((f) => document.fonts.load(`64px "${f}"`).catch(() => null))).then(() => listeners.forEach((l) => l()));
}

// ---------- live textures ----------
const DISPLAY_PX = 1024; // long edge of the on-screen texture

export function useZoneTextures(opts: { style: Style; layers: Layer[]; selectedId?: string | null; activeZone?: ZoneId | null; guides: boolean }) {
  const version = useAssetVersion();
  const [canvases] = useState(() => {
    if (typeof document === "undefined") return null; // SSR: textures are created on the client only
    const out = {} as Record<ZoneId, { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }>;
    for (const z of ZONE_IDS) {
      const canvas = document.createElement("canvas");
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      out[z] = { canvas, texture };
    }
    return out;
  });

  useEffect(() => () => Object.values(canvases ?? {}).forEach((c) => c.texture.dispose()), [canvases]);

  useEffect(() => {
    if (!canvases) return;
    for (const z of ZONE_IDS) {
      const { w, h } = zoneUnits(opts.style, z);
      const scale = DISPLAY_PX / Math.max(w, h);
      const { canvas, texture } = canvases[z];
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
        texture.dispose(); // size change requires re-upload
      }
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, cw, ch);
      const zoneLayers = opts.layers.filter((l) => l.zone === z);
      drawZone(ctx, zoneLayers, scale, getImage);
      if (opts.guides) drawGuides(ctx, cw, ch, z === opts.activeZone, zoneLayers.find((l) => l.id === opts.selectedId), scale);
      texture.needsUpdate = true;
    }
  }, [opts.style, opts.layers, opts.selectedId, opts.activeZone, opts.guides, canvases, version]);

  return useMemo(() => (canvases ? (Object.fromEntries(ZONE_IDS.map((z) => [z, canvases[z].texture])) as unknown as Record<ZoneId, THREE.Texture>) : undefined), [canvases]);
}

function drawGuides(ctx: CanvasRenderingContext2D, w: number, h: number, active: boolean, selected: Layer | undefined, scale: number) {
  ctx.save();
  const lw = Math.max(2, w / 220);
  ctx.lineWidth = lw;
  ctx.setLineDash([lw * 4, lw * 3]);
  ctx.strokeStyle = active ? "rgba(255,107,0,0.95)" : "rgba(255,255,255,0.35)";
  ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
  if (selected) {
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,107,0,1)";
    ctx.translate(selected.x * scale, selected.y * scale);
    ctx.rotate((selected.rotation * Math.PI) / 180);
    ctx.strokeRect((-selected.width * scale) / 2, (-selected.height * scale) / 2, selected.width * scale, selected.height * scale);
  }
  ctx.restore();
}

// ---------- print export ----------
/** Render one zone at print resolution (300 DPI) with transparent background. */
export async function renderPrintZone(style: Style, zone: ZoneId, layers: Layer[]): Promise<Blob | null> {
  const zl = layers.filter((l) => l.zone === zone && l.visible !== false);
  if (!zl.length) return null;
  await loadFonts();
  await Promise.all(zl.filter((l) => l.type === "image").map((l) => preloadImage((l as Extract<Layer, { type: "image" }>).assetId)));
  const { w, h } = zoneUnits(style, zone);
  const scale = PRINT_DPI / UNITS_PER_INCH;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  drawZone(ctx, zl, scale, getImage);
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
}

/** Effective print DPI of an image layer (warn customers about blurry prints). */
export function effectiveDpi(layer: Layer, meta?: { width: number; height: number; mime: string }) {
  if (layer.type !== "image" || !meta || meta.mime === "image/svg+xml") return Infinity;
  const inches = layer.width / UNITS_PER_INCH;
  return meta.width / inches;
}

export function layerBoundsInches(l: Layer) {
  const { hx, hy } = rotatedHalfExtents(l.width, l.height, l.rotation);
  return { w: (2 * hx) / UNITS_PER_INCH, h: (2 * hy) / UNITS_PER_INCH };
}
