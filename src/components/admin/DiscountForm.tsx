"use client";
import { useActionState } from "react";
import { saveDiscount } from "@/app/actions/admin";

export default function DiscountForm() {
  const [s, action, pending] = useActionState(saveDiscount, null);
  return (
    <form action={action} className="card grid gap-4 p-6 sm:grid-cols-3 lg:grid-cols-7 lg:items-end">
      <div className="lg:col-span-2"><label className="label" htmlFor="code">Code</label><input id="code" name="code" required className="input uppercase" placeholder="SUMMER15" /></div>
      <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" className="input"><option value="PERCENT" className="bg-coal">% off</option><option value="FIXED" className="bg-coal">$ off</option></select></div>
      <div><label className="label" htmlFor="value">Value</label><input id="value" name="value" type="number" step="0.01" min="0.01" required className="input" /></div>
      <div><label className="label" htmlFor="minSubtotal">Min. subtotal $</label><input id="minSubtotal" name="minSubtotal" type="number" step="0.01" min="0" defaultValue="0" className="input" /></div>
      <div><label className="label" htmlFor="maxUses">Max uses</label><input id="maxUses" name="maxUses" type="number" min="1" className="input" placeholder="∞" /></div>
      <div><label className="label" htmlFor="expiresAt">Expires</label><input id="expiresAt" name="expiresAt" type="date" className="input" /></div>
      <div className="flex items-center gap-3 sm:col-span-3 lg:col-span-7"><button className="btn-accent btn-sm" disabled={pending}>Create code</button>{s?.error && <span className="text-sm text-red-400">{s.error}</span>}{s?.ok && <span className="text-sm text-emerald-300">Created</span>}</div>
    </form>
  );
}
