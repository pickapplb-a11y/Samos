/** Decide whether to use the full 3D studio or the lightweight 2D preview. */
export function canUse3D(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("vanta:preview") === "2d") return false;
  } catch {}
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    if ((nav.deviceMemory ?? 8) < 2 || (navigator.hardwareConcurrency ?? 8) < 2) return false;
    return true;
  } catch {
    return false;
  }
}
