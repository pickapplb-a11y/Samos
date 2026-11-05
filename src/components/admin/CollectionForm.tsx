"use client";
import { useActionState } from "react";
import { saveCollection } from "@/app/actions/admin";

type C = { id: string; title: string; slug: string; subtitle: string; image: string; position: number; active: boolean; productIds: string[] };
export default function CollectionForm({ c, products }: { c?: C; products: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState(saveCollection, null);
  const k = c?.id ?? "new";
  return (
    <form action={action} className="card space-y-4 p-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div><label className="label" htmlFor={`t-${k}`}>Title</label><input id={`t-${k}`} name="title" required defaultValue={c?.title} className="input" /></div>
        <div><label className="label" htmlFor={`s-${k}`}>Slug</label><input id={`s-${k}`} name="slug" required defaultValue={c?.slug} className="input" /></div>
        <div className="lg:col-span-2"><label className="label" htmlFor={`st-${k}`}>Subtitle</label><input id={`st-${k}`} name="subtitle" defaultValue={c?.subtitle} className="input" /></div>
        <div><label className="label" htmlFor={`p-${k}`}>Position</label><input id={`p-${k}`} name="position" type="number" min={0} defaultValue={c?.position ?? 0} className="input" /></div>
        <div className="sm:col-span-2 lg:col-span-4"><label className="label" htmlFor={`i-${k}`}>Cover image path</label><input id={`i-${k}`} name="image" required defaultValue={c?.image} placeholder="/products/oversized-111111-front.webp" className="input" /></div>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="accent-[#FF6B00]" /> Show on homepage</label>
      </div>
      <fieldset><legend className="label">Products</legend><div className="flex flex-wrap gap-2">{products.map((p) => <label key={p.id} className="chip cursor-pointer has-[:checked]:chip-on"><input type="checkbox" name="productIds" value={p.id} defaultChecked={c?.productIds.includes(p.id)} className="mr-2 accent-[#FF6B00]" />{p.name}</label>)}</div></fieldset>
      <div className="flex items-center gap-3"><button className="btn-primary btn-sm" disabled={pending}>{c ? "Save" : "Create collection"}</button>{s?.error && <span className="text-sm text-red-400">{s.error}</span>}{s?.ok && <span className="text-sm text-emerald-300">Saved</span>}</div>
    </form>
  );
}
