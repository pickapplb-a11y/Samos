import type { Layer } from "./schema";
import type { Style, ZoneId } from "./zones";

export interface PricingConfig {
  studioBase: Record<Style, number>;
  zoneFee: Record<ZoneId, number>;
  extraLayerFee: number;
  sizeUpcharge: Record<string, number>;
  delivery: { standard: number; express: number; freeOver: number };
  codFee: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  studioBase: { OVERSIZED: 6900, REGULAR: 5900, ZIP: 7900 },
  zoneFee: { front: 1200, back: 1500, leftSleeve: 700, rightSleeve: 700 },
  extraLayerFee: 200,
  sizeUpcharge: { XXL: 400, "3XL": 700 },
  delivery: { standard: 600, express: 1500, freeOver: 15000 },
  codFee: 300,
};

export interface PriceLine {
  label: string;
  amount: number;
}

/** Price of one custom hoodie. Pure: the same function runs in the browser and on the server. */
export function priceCustom(
  cfg: PricingConfig,
  opts: { style: Style; layers: Layer[]; size?: string; baseOverride?: number | null },
) {
  const lines: PriceLine[] = [];
  const base = opts.baseOverride ?? cfg.studioBase[opts.style];
  lines.push({ label: "Blank hoodie", amount: base });
  const visible = opts.layers.filter((l) => l.visible !== false);
  const byZone = new Map<ZoneId, number>();
  for (const l of visible) byZone.set(l.zone as ZoneId, (byZone.get(l.zone as ZoneId) ?? 0) + 1);
  for (const [zone, count] of byZone) {
    lines.push({ label: `${zoneName(zone)} print`, amount: cfg.zoneFee[zone] });
    if (count > 1) lines.push({ label: `${zoneName(zone)}: ${count - 1} extra element(s)`, amount: (count - 1) * cfg.extraLayerFee });
  }
  const up = opts.size ? cfg.sizeUpcharge[opts.size] ?? 0 : 0;
  if (up) lines.push({ label: `Size ${opts.size}`, amount: up });
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

function zoneName(z: ZoneId) {
  return { front: "Front", back: "Back", leftSleeve: "Left sleeve", rightSleeve: "Right sleeve" }[z];
}

export function deliveryFee(cfg: PricingConfig, method: "standard" | "express", subtotalAfterDiscount: number) {
  if (method === "express") return cfg.delivery.express;
  return subtotalAfterDiscount >= cfg.delivery.freeOver ? 0 : cfg.delivery.standard;
}
