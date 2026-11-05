"use client";

import { useActionState, useEffect, useState } from "react";
import { saveAddress } from "@/app/actions/account";

type A = { id: string; label: string; fullName: string; phone: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string; isDefault: boolean };

export default function AddressForm({ address }: { address?: A }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(saveAddress, null);
  useEffect(() => { if (s?.ok) setOpen(false); }, [s]);
  if (!open) return <button className={address ? "btn-ghost btn-sm" : "btn-primary btn-sm"} onClick={() => setOpen(true)}>{address ? "Edit" : "+ Add address"}</button>;
  const f = (k: keyof A, label: string, req = true, type = "text") => (
    <div><label className="label" htmlFor={`${address?.id ?? "new"}-${k}`}>{label}</label><input id={`${address?.id ?? "new"}-${k}`} name={k} type={type} required={req} defaultValue={(address?.[k] as string) ?? ""} className="input" /></div>
  );
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label="Address">
      <form action={action} className="card scrollbar-thin max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-6">
        <h3 className="text-lg font-semibold">{address ? "Edit address" : "New address"}</h3>
        {address && <input type="hidden" name="id" value={address.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {f("label", "Label (Home, Work…)")}{f("fullName", "Full name")}{f("phone", "Phone", true, "tel")}{f("country", "Country")}
          <div className="sm:col-span-2">{f("line1", "Address")}</div>
          <div className="sm:col-span-2">{f("line2", "Apartment, floor", false)}</div>
          {f("city", "City")}{f("region", "Region", false)}{f("postalCode", "Postal code", false)}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="accent-[#FF6B00]" /> Default address</label>
        {s?.error && <p className="text-xs text-red-400">{s.error}</p>}
        <div className="flex gap-2"><button className="btn-primary btn-sm" disabled={pending}>Save</button><button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button></div>
      </form>
    </div>
  );
}
