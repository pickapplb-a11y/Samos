"use client";

import { useActionState } from "react";
import { savePricing } from "@/app/actions/admin";
import type { PricingConfig } from "@/lib/design/pricing";

export default function PricingForm({ cfg }: { cfg: PricingConfig }) {
  const [s, action, pending] = useActionState(savePricing, null);
  const f = (name: string, label: string, cents: number) => (
    <div><label className="label" htmlFor={name}>{label}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-mist">$</span><input id={name} name={name} type="number" step="0.01" min="0" required defaultValue={(cents / 100).toFixed(2)} className="input pl-7" /></div></div>
  );
  return (
    <form action={action} className="space-y-6">
      <section className="card p-6"><h2 className="mb-4 font-semibold">Studio base prices (blank hoodie)</h2><div className="grid gap-4 sm:grid-cols-3">{f("base.OVERSIZED", "Oversized", cfg.studioBase.OVERSIZED)}{f("base.REGULAR", "Regular fit", cfg.studioBase.REGULAR)}{f("base.ZIP", "Zip-up", cfg.studioBase.ZIP)}</div><p className="mt-3 text-xs text-mist">When a customer customises a specific product, that product&apos;s own price is used as the base.</p></section>
      <section className="card p-6"><h2 className="mb-4 font-semibold">Customization prices</h2><div className="grid gap-4 sm:grid-cols-5">{f("zone.front", "Front print", cfg.zoneFee.front)}{f("zone.back", "Back print", cfg.zoneFee.back)}{f("zone.leftSleeve", "Left sleeve", cfg.zoneFee.leftSleeve)}{f("zone.rightSleeve", "Right sleeve", cfg.zoneFee.rightSleeve)}{f("extraLayerFee", "Each extra element", cfg.extraLayerFee)}</div></section>
      <section className="card p-6"><h2 className="mb-4 font-semibold">Sizes, delivery & COD</h2><div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">{f("size.XXL", "XXL upcharge", cfg.sizeUpcharge.XXL ?? 0)}{f("size.3XL", "3XL upcharge", cfg.sizeUpcharge["3XL"] ?? 0)}{f("delivery.standard", "Standard delivery", cfg.delivery.standard)}{f("delivery.express", "Express delivery", cfg.delivery.express)}{f("delivery.freeOver", "Free standard over", cfg.delivery.freeOver)}{f("codFee", "Cash-on-delivery fee", cfg.codFee)}</div></section>
      <div className="flex items-center gap-3"><button className="btn-accent" disabled={pending}>Save pricing</button>{s?.ok && <span className="text-sm text-emerald-300">Saved — live in the studio and checkout</span>}{s?.error && <span className="text-sm text-red-400">{s.error}</span>}</div>
    </form>
  );
}
