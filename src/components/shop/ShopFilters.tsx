"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { STUDIO_COLORS } from "@/lib/design/zones";
import { cn } from "@/lib/format";

export default function ShopFilters({ categories, colors, sizes }: { categories: { slug: string; name: string }[]; colors: string[]; sizes: string[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (sp.get("focus") === "search") search.current?.focus();
  }, [sp]);

  const set = (key: string, value?: string | null) => {
    const next = new URLSearchParams(sp.toString());
    next.delete("focus");
    next.delete("collection");
    if (!value || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    start(() => router.replace(`${path}?${next.toString()}`, { scroll: false }));
  };
  useEffect(() => {
    const t = setTimeout(() => (q !== (sp.get("q") ?? "")) && set("q", q.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const active = ["category", "style", "color", "size", "min", "max", "q"].filter((k) => sp.get(k));

  const group = (title: string, children: React.ReactNode) => (
    <fieldset className="border-b border-white/[0.07] py-5">
      <legend className="label">{title}</legend>
      <div className="mt-1">{children}</div>
    </fieldset>
  );

  return (
    <aside aria-label="Filters" className={cn("transition-opacity", pending && "opacity-60")}>
      <div className="flex gap-2">
        <label htmlFor="shop-q" className="sr-only">Search products</label>
        <input id="shop-q" ref={search} type="search" className="input" placeholder="Search hoodies" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-ghost btn-sm h-11 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>Filters{active.length ? ` (${active.length})` : ""}</button>
      </div>
      <div className="mt-4">
        <label htmlFor="sort" className="label">Sort by</label>
        <select id="sort" className="input" value={sp.get("sort") ?? "popular"} onChange={(e) => set("sort", e.target.value === "popular" ? null : e.target.value)}>
          <option value="popular" className="bg-coal">Most popular</option>
          <option value="new" className="bg-coal">Newest</option>
          <option value="price-asc" className="bg-coal">Price: low to high</option>
          <option value="price-desc" className="bg-coal">Price: high to low</option>
        </select>
      </div>
      <div className={cn("lg:block", open ? "block" : "hidden")}>
        {group("Category", (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => <button key={c.slug} onClick={() => set("category", c.slug)} aria-pressed={sp.get("category") === c.slug} className={cn("chip", sp.get("category") === c.slug && "chip-on")}>{c.name}</button>)}
          </div>
        ))}
        {group("Fit", (
          <div className="flex flex-wrap gap-2">
            {[["OVERSIZED", "Oversized"], ["REGULAR", "Regular"], ["ZIP", "Zip-up"]].map(([v, l]) => <button key={v} onClick={() => set("style", v)} aria-pressed={sp.get("style") === v} className={cn("chip", sp.get("style") === v && "chip-on")}>{l}</button>)}
          </div>
        ))}
        {group("Colour", (
          <div className="grid grid-cols-6 gap-2">
            {colors.map((name) => {
              const hex = STUDIO_COLORS.find((c) => c.name === name)?.hex;
              const on = sp.get("color")?.toLowerCase() === name.toLowerCase();
              return <button key={name} title={name} aria-label={name} aria-pressed={on} onClick={() => set("color", name)} className={cn("aspect-square rounded-full border border-white/20 transition hover:scale-110", on && "ring-2 ring-blaze ring-offset-2 ring-offset-ink")} style={{ background: hex }} />;
            })}
          </div>
        ))}
        {group("Size in stock", (
          <div className="grid grid-cols-4 gap-2">
            {sizes.map((s) => <button key={s} onClick={() => set("size", s)} aria-pressed={sp.get("size") === s} className={cn("h-9 rounded-lg border text-xs font-semibold", sp.get("size") === s ? "border-white bg-white text-ink" : "border-white/10 hover:border-white/40")}>{s}</button>)}
          </div>
        ))}
        {group("Price (USD)", (
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const next = new URLSearchParams(sp.toString()); for (const k of ["min", "max"]) { const v = String(f.get(k) || ""); v ? next.set(k, v) : next.delete(k); } router.replace(`${path}?${next}`, { scroll: false }); }}>
            <input name="min" type="number" min={0} placeholder="Min" defaultValue={sp.get("min") ?? ""} className="input h-9" aria-label="Minimum price" />
            <span className="text-mist">–</span>
            <input name="max" type="number" min={0} placeholder="Max" defaultValue={sp.get("max") ?? ""} className="input h-9" aria-label="Maximum price" />
            <button className="btn-ghost btn-sm h-9 px-3">Go</button>
          </form>
        ))}
        {active.length > 0 && <button className="mt-5 text-xs text-mist underline-offset-2 hover:text-white hover:underline" onClick={() => { setQ(""); router.replace(path); }}>Clear all filters</button>}
      </div>
    </aside>
  );
}
