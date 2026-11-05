import * as THREE from "three";

function heightToNormal(h: Float32Array, size: number, strength: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

let rnd = 1;
const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

/** French-terry / jersey knit: rows of V-shaped stitches plus fibre noise. */
function knitHeight(size: number) {
  rnd = 7;
  const h = new Float32Array(size * size);
  const cols = 64;
  const rows = 48;
  const noise = new Float32Array(size * size).map(() => rand());
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const cx = ((x / size) * cols) % 1;
      const cy = ((y / size) * rows) % 1;
      // two slanted loops per stitch -> a "V"
      const leg = cx < 0.5 ? Math.abs(cx - 0.25 - (cy - 0.5) * 0.25) : Math.abs(cx - 0.75 + (cy - 0.5) * 0.25);
      const loop = Math.max(0, 1 - leg * 6) * (0.7 + 0.3 * Math.sin(cy * Math.PI));
      h[y * size + x] = loop + noise[y * size + x] * 0.25;
    }
  return h;
}

function ribHeight(size: number) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) h[y * size + x] = Math.pow(Math.abs(Math.sin((x / size) * Math.PI * 24)), 0.6);
  return h;
}

let cache: { knit: THREE.Texture; rib: THREE.Texture } | null = null;
export function fabricTextures() {
  if (cache) return cache;
  const mk = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
  };
  cache = { knit: mk(heightToNormal(knitHeight(256), 256, 1.4)), rib: mk(heightToNormal(ribHeight(128), 128, 2.5)) };
  return cache;
}

/** Shading for patch pockets: soft edge darkening + stitch lines (multiplied with fabric colour). */
export function pocketTexture(kind: "kangaroo" | "side") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 512, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(0,0,0,0.28)");
  g.addColorStop(0.06, "rgba(0,0,0,0)");
  g.addColorStop(0.94, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2;
  if (kind === "kangaroo") {
    // slanted hand openings on both sides
    for (const side of [0, 1]) {
      const x0 = side ? 512 - 70 : 70;
      const grad = ctx.createLinearGradient(side ? 512 : 0, 0, x0, 0);
      grad.addColorStop(0, "rgba(0,0,0,0.45)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(side ? 512 : 0, 0);
      ctx.lineTo(x0, 0);
      ctx.lineTo(side ? 512 : 0, 200);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x0 + (side ? 10 : -10), 4);
      ctx.lineTo(side ? 502 : 10, 205);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(70, 10);
    ctx.lineTo(442, 10);
    ctx.moveTo(10, 246);
    ctx.lineTo(502, 246);
    ctx.stroke();
  } else {
    ctx.strokeRect(10, 10, 492, 236);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
