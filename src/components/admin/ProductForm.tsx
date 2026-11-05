"use client";

import { useActionState, useRef, useState } from "react";
import { saveProduct } from "@/app/actions/admin";

type P = { id?: string; name?: string; slug?: string; tagline?: string; description?: string; style?: string; categoryId?: string | null; basePrice?: number; compareAt?: number | null; material?: string; fit?: string; care?: string; images?: string[]; colors?: { name: string; hex: string }[]; active?: boolean; featured?: boolean; customizable?: boolean };

export default function ProductForm({ p = {}, categories }: { p?: P; categories: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState(saveProduct, null);
  const [images, setImages] = useState((p.images ?? []).join("\n"));
  const [uploading, setUploading] = useState(false);
  const slugRef = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/admin/uploads", { method: "POST", body: fd });
    const j = await r.json();
    setUploading(false);
    if (r.ok) setImages((v) => (v ? v + "\n" : "") + j.url);
    else alert(j.error);
  }
  const t = (name: keyof P, label: string, rows = 3) => (
    <div><label className="label" htmlFor={name}>{label}</label><textarea id={name} name={name} rows={rows} required defaultValue={(p[name] as string) ?? ""} className="input h-auto py-3" /></div>
  );
  return (
    <form action={action} className="grid gap-6 xl:grid-cols-2">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="card space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required defaultValue={p.name} className="input" onChange={(e) => { if (!p.id && slugRef.current) slugRef.current.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }} /></div>
          <div><label className="label" htmlFor="slug">URL slug</label><input id="slug" ref={slugRef} name="slug" required defaultValue={p.slug} className="input" /></div>
        </div>
        <div><label className="label" htmlFor="tagline">Tagline</label><input id="tagline" name="tagline" defaultValue={p.tagline} className="input" /></div>
        {t("description", "Description", 4)}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="style">Fit / style</label><select id="style" name="style" defaultValue={p.style ?? "OVERSIZED"} className="input"><option value="OVERSIZED" className="bg-coal">Oversized</option><option value="REGULAR" className="bg-coal">Regular</option><option value="ZIP" className="bg-coal">Zip-up</option></select></div>
          <div><label className="label" htmlFor="categoryId">Category</label><select id="categoryId" name="categoryId" defaultValue={p.categoryId ?? ""} className="input"><option value="" className="bg-coal">None</option>{categories.map((c) => <option key={c.id} value={c.id} className="bg-coal">{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="price">Base price (USD)</label><input id="price" name="price" type="number" step="0.01" min="1" required defaultValue={p.basePrice ? p.basePrice / 100 : ""} className="input" /></div>
          <div><label className="label" htmlFor="compareAt">Compare-at price</label><input id="compareAt" name="compareAt" type="number" step="0.01" min="0" defaultValue={p.compareAt ? p.compareAt / 100 : ""} className="input" /></div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          {(["active", "featured", "customizable"] as const).map((k) => <label key={k} className="flex items-center gap-2 capitalize"><input type="checkbox" name={k} defaultChecked={p[k] ?? k !== "featured"} className="accent-[#FF6B00]" />{k}</label>)}
        </div>
      </div>
      <div className="card space-y-4 p-6">
        {t("material", "Material description")}
        {t("fit", "Fit information", 2)}
        {t("care", "Washing instructions", 2)}
        <div>
          <label className="label" htmlFor="colors">Colours — one per line: Name, #RRGGBB</label>
          <textarea id="colors" name="colors" rows={4} required defaultValue={(p.colors ?? []).map((c) => `${c.name}, ${c.hex}`).join("\n")} className="input h-auto py-3 font-mono text-xs" />
        </div>
        <div>
          <div className="flex items-center justify-between"><label className="label" htmlFor="images">Images — one path per line (front, back, side per colour)</label><label className="btn-ghost btn-sm cursor-pointer">{uploading ? "Uploading…" : "Upload"}<input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label></div>
          <textarea id="images" name="images" rows={4} value={images} onChange={(e) => setImages(e.target.value)} className="input h-auto py-3 font-mono text-xs" />
        </div>
      </div>
      <div className="xl:col-span-2 flex items-center gap-3">
        <button className="btn-accent" disabled={pending}>{pending ? "Saving…" : p.id ? "Save changes" : "Create product"}</button>
        {s?.error && <p className="text-sm text-red-400" role="alert">{s.error}</p>}
        {s?.ok && <p className="text-sm text-emerald-300">Saved</p>}
      </div>
    </form>
  );
}
