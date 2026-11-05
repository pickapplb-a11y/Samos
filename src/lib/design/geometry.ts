import type { Layer } from "./schema";

/** Axis-aligned half-extents of a rectangle rotated by `deg`. */
export function rotatedHalfExtents(w: number, h: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { hx: (w * c + h * s) / 2, hy: (w * s + h * c) / 2 };
}

/**
 * Constrain a layer so its rotated bounding box lies fully inside the printable
 * area [0,W]x[0,H]. Shrinks the layer (keeping aspect) if it cannot fit, then clamps position.
 */
export function constrainLayer<T extends Layer>(layer: T, W: number, H: number): T {
  let { width, height } = layer;
  let { hx, hy } = rotatedHalfExtents(width, height, layer.rotation);
  const fit = Math.min(1, W / (2 * hx), H / (2 * hy));
  if (fit < 1) {
    width *= fit * 0.999;
    height *= fit * 0.999;
    hx *= fit * 0.999;
    hy *= fit * 0.999;
  }
  const x = Math.min(W - hx, Math.max(hx, layer.x));
  const y = Math.min(H - hy, Math.max(hy, layer.y));
  const out = { ...layer, x, y, width, height };
  if (out.type === "text" && fit < 1) (out as Extract<Layer, { type: "text" }>).fontSize *= fit * 0.999;
  return out;
}

export function isInside(layer: Layer, W: number, H: number, eps = 0.5) {
  const { hx, hy } = rotatedHalfExtents(layer.width, layer.height, layer.rotation);
  return layer.x - hx >= -eps && layer.y - hy >= -eps && layer.x + hx <= W + eps && layer.y + hy <= H + eps;
}

/** Hit-test a point in zone units against a rotated layer. */
export function hitTest(layer: Layer, px: number, py: number) {
  const r = (-layer.rotation * Math.PI) / 180;
  const dx = px - layer.x;
  const dy = py - layer.y;
  const lx = dx * Math.cos(r) - dy * Math.sin(r);
  const ly = dx * Math.sin(r) + dy * Math.cos(r);
  return Math.abs(lx) <= layer.width / 2 && Math.abs(ly) <= layer.height / 2;
}
