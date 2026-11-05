import type { Layer, TextLayer } from "./schema";

export type ImageSource = CanvasImageSource & { width: number; height: number };

/**
 * Draw every visible layer of one zone onto a 2D context.
 * `scale` maps logical zone units -> canvas pixels. Used for the 3D texture,
 * the 2D fallback preview and the 300 DPI print file, so all three are identical.
 */
export function drawZone(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  scale: number,
  getImage: (assetId: string) => ImageSource | undefined,
) {
  for (const layer of layers) {
    if (layer.visible === false) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.translate(layer.x * scale, layer.y * scale);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    if (layer.type === "image") {
      const img = getImage(layer.assetId);
      if (img) {
        if (layer.flipX) ctx.scale(-1, 1);
        const w = layer.width * scale;
        const h = layer.height * scale;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
    } else {
      drawText(ctx, layer, scale);
    }
    ctx.restore();
  }
}

export function fontString(l: Pick<TextLayer, "fontFamily" | "fontSize">, scale = 1) {
  return `${l.fontSize * scale}px "${l.fontFamily}"`;
}

function drawText(ctx: CanvasRenderingContext2D, l: TextLayer, scale: number) {
  ctx.font = fontString(l, scale);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const spacing = (l.letterSpacing ?? 0) * scale;
  // letterSpacing is supported by modern canvas; fall back gracefully.
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  // The layer box is the measured text box; scale glyphs to fill it exactly so resizing stretches proportionally.
  const m = measureText(ctx, l, scale);
  const sx = (l.width * scale) / Math.max(1, m.w);
  const sy = (l.height * scale) / Math.max(1, m.h);
  ctx.scale(sx, sy);
  if (l.strokeWidth && l.strokeColor) {
    ctx.lineJoin = "round";
    ctx.lineWidth = l.strokeWidth * scale * 2;
    ctx.strokeStyle = l.strokeColor;
    ctx.strokeText(l.text, spacing / 2, 0);
  }
  ctx.fillStyle = l.color;
  ctx.fillText(l.text, spacing / 2, 0);
}

function measureText(ctx: CanvasRenderingContext2D, l: TextLayer, scale: number) {
  const tm = ctx.measureText(l.text);
  const pad = (l.strokeWidth ?? 0) * scale * 2;
  return { w: tm.width + pad, h: l.fontSize * scale * 1.2 + pad };
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** Natural box (zone units) for a text layer at its font size. */
export function measureTextBox(l: Pick<TextLayer, "text" | "fontFamily" | "fontSize" | "letterSpacing" | "strokeWidth">) {
  if (typeof document === "undefined") return { w: l.text.length * l.fontSize * 0.6, h: l.fontSize * 1.2 };
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx!;
  ctx.font = fontString(l);
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${l.letterSpacing ?? 0}px`;
  const w = ctx.measureText(l.text).width + (l.strokeWidth ?? 0) * 2;
  return { w: Math.max(4, w), h: l.fontSize * 1.2 + (l.strokeWidth ?? 0) * 2 };
}

/** Text layers seeded server-side carry a placeholder 1×1 box; measure them precisely in the browser. */
export function normalizeTextLayers<T extends { type: string }>(layers: T[]): T[] {
  return layers.map((l) => {
    const t = l as unknown as TextLayer;
    if (t.type !== "text" || t.width > 1) return l;
    const m = measureTextBox(t);
    return { ...t, width: m.w, height: m.h } as unknown as T;
  });
}
