import "server-only";
import { db } from "./db";
import { DEFAULT_PRICING, type PricingConfig } from "./design/pricing";

export async function getPricing(): Promise<PricingConfig> {
  const row = await db.setting.findUnique({ where: { key: "pricing" } });
  const v = (row?.value ?? {}) as Partial<PricingConfig>;
  return {
    studioBase: { ...DEFAULT_PRICING.studioBase, ...v.studioBase },
    zoneFee: { ...DEFAULT_PRICING.zoneFee, ...v.zoneFee },
    extraLayerFee: v.extraLayerFee ?? DEFAULT_PRICING.extraLayerFee,
    sizeUpcharge: { ...DEFAULT_PRICING.sizeUpcharge, ...v.sizeUpcharge },
    delivery: { ...DEFAULT_PRICING.delivery, ...v.delivery },
    codFee: v.codFee ?? DEFAULT_PRICING.codFee,
  };
}

export const features = {
  card: () => !!process.env.STRIPE_SECRET_KEY,
  ai: () => !!process.env.OPENAI_API_KEY,
};
