"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CardProps } from "@/lib/catalog";
import { money } from "@/lib/format";

/** Hover reveals the back view; colour dots swap the photographed colourway. */
export default function ProductCard({ p, priority = false }: { p: CardProps; priority?: boolean }) {
  const [colorIdx, setColorIdx] = useState(0);
  const set = Math.min(colorIdx, Math.floor(p.images.length / 3) - 1);
  const front = p.images[set * 3] ?? p.images[0] ?? "/products/placeholder.svg";
  const back = p.images[set * 3 + 1] ?? front;
  const photographed = Math.max(1, Math.floor(p.images.length / 3));
  return (
    <article className="group">
      <Link href={`/shop/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-coal" aria-label={p.name}>
        <Image src={front} alt={`${p.name} — front`} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" priority={priority} className="object-cover transition duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-0" />
        <Image src={back} alt="" aria-hidden fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.compareAt && <span className="rounded-full bg-blaze px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">Sale</span>}
          {p.customizable && <span className="rounded-full bg-ink/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">Customizable</span>}
        </div>
        <span className="absolute inset-x-3 bottom-3 translate-y-3 rounded-full bg-white py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-ink opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          View product
        </span>
      </Link>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold"><Link href={`/shop/${p.slug}`}>{p.name}</Link></h3>
          <p className="mt-0.5 truncate text-xs text-mist">{p.tagline}</p>
        </div>
        <p className="shrink-0 text-sm">
          {p.compareAt && <s className="mr-1.5 text-mist">{money(p.compareAt)}</s>}
          {money(p.price)}
        </p>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        {p.colors.slice(0, 6).map((c, i) => (
          <button
            key={c.hex}
            title={c.name}
            aria-label={`Show ${c.name}`}
            onMouseEnter={() => i < photographed && setColorIdx(i)}
            onFocus={() => i < photographed && setColorIdx(i)}
            onClick={() => i < photographed && setColorIdx(i)}
            className={`h-3.5 w-3.5 rounded-full border transition ${i === set ? "border-white ring-1 ring-white ring-offset-2 ring-offset-ink" : "border-white/25"}`}
            style={{ background: c.hex }}
          />
        ))}
        {p.colors.length > 6 && <span className="text-[10px] text-mist">+{p.colors.length - 6}</span>}
        {p.reviewCount > 0 && <span className="ml-auto text-[11px] text-mist">★ {p.rating.toFixed(1)} ({p.reviewCount})</span>}
      </div>
    </article>
  );
}
