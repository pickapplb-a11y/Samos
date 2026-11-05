import * as THREE from "three";
import { ZONES, type Style, type ZoneId } from "@/lib/design/zones";

/**
 * Procedural hoodie built at real-world scale (1 unit = 1 metre), front facing +Z.
 * Every print zone is a patch of the garment surface with arc-length UVs, so a
 * 12" print measures 12" on the 3D garment and artwork wraps the curvature correctly.
 */
export interface Dims {
  halfW: number;
  halfD: number;
  shoulderY: number;
  neckY: number;
  neckR: number;
  sleeveAngle: number;
  sleeveLen: number;
  r0: number;
  r1: number;
  n: number;
  frontTop: number;
  backTop: number;
  pocket: { top: number; bottom: number; wTop: number; wBottom: number };
}

const deg = Math.PI / 180;
export const DIMS: Record<Style, Dims> = {
  OVERSIZED: { halfW: 0.335, halfD: 0.175, shoulderY: 0.66, neckY: 0.77, neckR: 0.1, sleeveAngle: 24 * deg, sleeveLen: 0.6, r0: 0.112, r1: 0.074, n: 2.7, frontTop: 0.63, backTop: 0.6, pocket: { top: 0.27, bottom: 0.075, wTop: 0.3, wBottom: 0.42 } },
  REGULAR: { halfW: 0.285, halfD: 0.152, shoulderY: 0.64, neckY: 0.735, neckR: 0.094, sleeveAngle: 18 * deg, sleeveLen: 0.62, r0: 0.094, r1: 0.058, n: 2.5, frontTop: 0.61, backTop: 0.585, pocket: { top: 0.27, bottom: 0.075, wTop: 0.26, wBottom: 0.36 } },
  ZIP: { halfW: 0.3, halfD: 0.16, shoulderY: 0.65, neckY: 0.75, neckR: 0.097, sleeveAngle: 20 * deg, sleeveLen: 0.61, r0: 0.1, r1: 0.063, n: 2.6, frontTop: 0.6, backTop: 0.59, pocket: { top: 0.26, bottom: 0.08, wTop: 0.17, wBottom: 0.2 } },
};

const INCH = 0.0254;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const spow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

export function torsoRadii(d: Dims, y: number): [number, number] {
  const t0 = smooth(clamp01(y / 0.2));
  let a = d.halfW * (0.955 + 0.045 * t0);
  let b = d.halfD * (0.965 + 0.035 * t0);
  // Shoulder: ease-in (zero slope at the start) so there is no crease, over a range that begins below shoulderY.
  const start = d.shoulderY - 0.05;
  if (y > start) {
    const t = clamp01((y - start) / (d.neckY - start));
    const fa = 1 - Math.cos((t * Math.PI) / 2);
    const fb = Math.pow(fa, 0.8);
    a = a + (d.neckR - a) * Math.pow(fa, 1.15);
    b = b + (d.neckR * 0.92 - b) * fb;
  }
  return [a, b];
}

export type SurfaceFn = (u: number, v: number) => THREE.Vector3;

export const torsoFn = (d: Dims, inflate = 0): SurfaceFn => (theta, y) => {
  const [a, b] = torsoRadii(d, y);
  const e = 2 / d.n;
  return new THREE.Vector3((a + inflate) * spow(Math.sin(theta), e), y, (b + inflate) * spow(Math.cos(theta), e));
};

export function sleeveFrame(d: Dims, side: 1 | -1) {
  const a = d.sleeveAngle;
  const origin = new THREE.Vector3(side * (d.halfW - d.r0 * 0.95), d.shoulderY - d.r0 * 0.75, 0);
  const dir = new THREE.Vector3(side * Math.sin(a), -Math.cos(a), 0);
  const out = new THREE.Vector3(side * Math.cos(a), Math.sin(a), 0);
  const fwd = new THREE.Vector3(0, 0, 1);
  return { origin, dir, out, fwd };
}

export const sleeveRadius = (d: Dims, dist: number) => {
  const t = clamp01(dist / d.sleeveLen);
  return d.r0 + (d.r1 - d.r0) * Math.pow(t, 0.8);
};

export const sleeveFn = (d: Dims, side: 1 | -1, inflate = 0): SurfaceFn => {
  const f = sleeveFrame(d, side);
  return (phi, dist) => {
    const r = sleeveRadius(d, dist) + inflate;
    return f.origin
      .clone()
      .addScaledVector(f.dir, dist)
      .addScaledVector(f.out, r * Math.cos(phi))
      .addScaledVector(f.fwd, r * 0.88 * Math.sin(phi));
  };
};

function normalAt(P: SurfaceFn, u: number, v: number, flip: boolean) {
  const h = 1e-3;
  const du = P(u + h, v).sub(P(u - h, v));
  const dv = P(u, v + h).sub(P(u, v - h));
  const n = new THREE.Vector3().crossVectors(du, dv).normalize();
  return flip ? n.negate() : n;
}

/** Grid surface with analytic (finite-difference) normals, so there is no shading seam. */
export function buildSurface(P: SurfaceFn, u0: number, u1: number, v0: number, v1: number, nu: number, nv: number, flipNormals: boolean, uvScale = 1) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let arcV = 0;
  let prevRow: THREE.Vector3 | null = null;
  for (let j = 0; j <= nv; j++) {
    const v = v0 + ((v1 - v0) * j) / nv;
    let arcU = 0;
    let prev: THREE.Vector3 | null = null;
    const rowStart = P(u0, v);
    if (prevRow) arcV += rowStart.distanceTo(prevRow);
    prevRow = rowStart;
    for (let i = 0; i <= nu; i++) {
      const u = u0 + ((u1 - u0) * i) / nu;
      const p = P(u, v);
      if (prev) arcU += p.distanceTo(prev);
      prev = p;
      const n = normalAt(P, u, v, flipNormals);
      pos.push(p.x, p.y, p.z);
      nor.push(n.x, n.y, n.z);
      uv.push(arcU * uvScale, arcV * uvScale);
    }
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const e = c + 1;
      if (flipNormals) idx.push(a, c, b, b, c, e);
      else idx.push(a, b, c, b, e, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Find parameter u at signed arc length `s` from uc along a row (numeric inversion). */
function arcTable(P: SurfaceFn, uc: number, v: number, span: number, steps = 600) {
  const fwd: { u: number; s: number }[] = [{ u: uc, s: 0 }];
  const back: { u: number; s: number }[] = [{ u: uc, s: 0 }];
  for (const [list, sign] of [[fwd, 1], [back, -1]] as const) {
    let prev = P(uc, v);
    let s = 0;
    for (let k = 1; k <= steps; k++) {
      const u = uc + (sign * span * k) / steps;
      const p = P(u, v);
      s += p.distanceTo(prev);
      prev = p;
      list.push({ u, s: sign * s });
    }
  }
  return (target: number) => {
    const list = target >= 0 ? fwd : back;
    const t = Math.abs(target);
    for (let k = 1; k < list.length; k++) {
      const a = Math.abs(list[k - 1].s);
      const b = Math.abs(list[k].s);
      if (b >= t) return list[k - 1].u + ((list[k].u - list[k - 1].u) * (t - a)) / Math.max(1e-9, b - a);
    }
    return list[list.length - 1].u;
  };
}

/**
 * Print patch: a w x h (metres) region of a surface, offset along the normal, with UVs 0..1
 * laid out by arc length. `vTop`/`vDir` give where the top edge of the artwork sits and which
 * way "down" runs in surface parameter space; `uDir` says which way artwork-right runs.
 */
export function buildPatch(opts: {
  P: SurfaceFn;
  uc: number;
  uSpan: number;
  uDir: 1 | -1;
  sOffset?: number;
  vTop: number;
  vDir: 1 | -1;
  width: number | ((fy: number) => number);
  height: number;
  offset: number;
  flipNormals?: boolean;
  nu?: number;
  nv?: number;
}) {
  const nu = opts.nu ?? 32;
  const nv = opts.nv ?? 32;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nv; j++) {
    const fy = j / nv;
    const v = opts.vTop + opts.vDir * fy * opts.height;
    const inv = arcTable(opts.P, opts.uc, v, opts.uSpan);
    const w = typeof opts.width === "function" ? opts.width(fy) : opts.width;
    for (let i = 0; i <= nu; i++) {
      const fx = i / nu;
      const s = opts.uDir * ((opts.sOffset ?? 0) + (fx - 0.5) * w);
      const u = inv(s);
      const n = normalAt(opts.P, u, v, !!opts.flipNormals);
      const p = opts.P(u, v).addScaledVector(n, opts.offset);
      pos.push(p.x, p.y, p.z);
      nor.push(n.x, n.y, n.z);
      uv.push(fx, 1 - fy);
    }
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // Make the winding face outward regardless of uDir/vDir.
  const testN = new THREE.Vector3(nor[0], nor[1], nor[2]);
  const pa = new THREE.Vector3(pos[0], pos[1], pos[2]);
  const pb = new THREE.Vector3(pos[3], pos[4], pos[5]);
  const pc = new THREE.Vector3(pos[(nu + 1) * 3], pos[(nu + 1) * 3 + 1], pos[(nu + 1) * 3 + 2]);
  const faceN = new THREE.Vector3().crossVectors(pc.clone().sub(pa), pb.clone().sub(pa));
  if (faceN.dot(testN) < 0) {
    const arr = g.index!.array as unknown as number[];
    for (let k = 0; k < arr.length; k += 3) [arr[k + 1], arr[k + 2]] = [arr[k + 2], arr[k + 1]];
  }
  return g;
}

/** Geometry for each printable zone of a style. */
export function zonePatches(style: Style): Record<ZoneId, THREE.BufferGeometry> {
  const d = DIMS[style];
  const z = ZONES[style];
  const torso = torsoFn(d);
  const front =
    style === "ZIP"
      ? buildPatch({ P: torso, uc: 0, uSpan: 1.6, uDir: 1, sOffset: 0.13, vTop: d.frontTop - 0.01, vDir: -1, width: z.front.widthIn * INCH, height: z.front.heightIn * INCH, offset: 0.0045 })
      : buildPatch({ P: torso, uc: 0, uSpan: 1.6, uDir: 1, vTop: d.frontTop, vDir: -1, width: z.front.widthIn * INCH, height: z.front.heightIn * INCH, offset: 0.0045 });
  const back = buildPatch({ P: torso, uc: Math.PI, uSpan: 1.6, uDir: 1, vTop: d.backTop, vDir: -1, width: z.back.widthIn * INCH, height: z.back.heightIn * INCH, offset: 0.0025 });
  const sleeve = (side: 1 | -1, spec: { widthIn: number; heightIn: number }) =>
    buildPatch({ P: sleeveFn(d, side), uc: 0, uSpan: 1.4, uDir: side === 1 ? -1 : 1, vTop: 0.075, vDir: 1, width: spec.widthIn * INCH, height: spec.heightIn * INCH, offset: 0.0025, flipNormals: side === -1, nu: 12, nv: 48 });
  return { front, back, leftSleeve: sleeve(1, z.leftSleeve), rightSleeve: sleeve(-1, z.rightSleeve) };
}

export function pocketPatches(style: Style) {
  const d = DIMS[style];
  const torso = torsoFn(d);
  const p = d.pocket;
  const h = p.top - p.bottom;
  if (style === "ZIP") {
    return [1, -1].map((side) =>
      buildPatch({ P: torso, uc: 0, uSpan: 1.6, uDir: 1, sOffset: side * (0.02 + p.wTop / 2), vTop: p.top, vDir: -1, width: (fy) => p.wTop + (p.wBottom - p.wTop) * fy, height: h, offset: 0.0035, nu: 12, nv: 12 }),
    );
  }
  return [buildPatch({ P: torso, uc: 0, uSpan: 1.6, uDir: 1, vTop: p.top, vDir: -1, width: (fy) => p.wTop + (p.wBottom - p.wTop) * fy, height: h, offset: 0.0035, nu: 16, nv: 12 })];
}

/** Tube that follows the torso front centre (zipper / drawstrings). */
export function frontPath(style: Style, x: number, yTop: number, yBottom: number, lift: number) {
  const d = DIMS[style];
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 24; k++) {
    const y = yTop + ((yBottom - yTop) * k) / 24;
    const [a, b] = torsoRadii(d, y);
    const e = 2 / d.n;
    const theta = Math.asin(Math.min(0.99, Math.pow(Math.abs(x) / a, 1 / e))) * Math.sign(x);
    pts.push(new THREE.Vector3(x, y, b * spow(Math.cos(theta), e) + lift));
  }
  return new THREE.CatmullRomCurve3(pts);
}
