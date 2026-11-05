"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/store";
import { money, cn } from "@/lib/format";

interface Props {
  product: { id: string; slug: string; name: string; price: number; compareAt: number | null; style: "OVERSIZED" | "REGULAR" | "ZIP"; customizable: boolean; image: string };
  colors: { name: string; hex: string }[];
  sizes: string[];
  stock: Record<string, number>; // `${hex}|${size}` -> qty
  sizeUpcharge: Record<string, number>;
}

export default function BuyBox({ product, colors, sizes, stock, sizeUpcharge }: Props) {
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");
  const add = useCart((s) => s.add);
  const left = size ? stock[`${color.hex}|${size}`] ?? 0 : null;
  const unit = product.price + (size ? sizeUpcharge[size] ?? 0 : 0);

  return (
    <div>
      <p className="mt-4 text-2xl">
        {product.compareAt && <s className="mr-2 text-lg text-mist">{money(product.compareAt)}</s>}
        {money(unit)}
      </p>
      <fieldset className="mt-8">
        <legend className="label">Colour — <span className="normal-case tracking-normal text-white">{color.name}</span></legend>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {colors.map((c) => (
            <button key={c.hex} onClick={() => setColor(c)} aria-pressed={c.hex === color.hex} aria-label={c.name} title={c.name} className={cn("h-9 w-9 rounded-full border border-white/20 transition hover:scale-110", c.hex === color.hex && "ring-2 ring-blaze ring-offset-2 ring-offset-ink")} style={{ background: c.hex }} />
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-7">
        <div className="flex items-center justify-between">
          <legend className="label">Size</legend>
          <Link href="/size-guide" className="text-xs text-mist underline-offset-2 hover:text-white hover:underline">Size guide</Link>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {sizes.map((s) => {
            const n = stock[`${color.hex}|${s}`] ?? 0;
            return (
              <button key={s} disabled={n === 0} onClick={() => { setSize(s); setErr(""); }} aria-pressed={size === s} className={cn("h-11 rounded-xl border text-xs font-semibold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-30", size === s ? "border-white bg-white text-ink" : "border-white/15 hover:border-white/50")}>
                {s}
              </button>
            );
          })}
        </div>
        <p className="mt-2 min-h-[1rem] text-xs text-mist" aria-live="polite">{left !== null && (left <= 5 ? <span className="text-blaze">Only {left} left in {size}</span> : "In stock — ships in 2–4 business days")}</p>
      </fieldset>
      <div className="mt-6 flex gap-3">
        <div className="flex h-14 items-center rounded-full border border-white/15">
          <button className="h-14 w-11" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <span className="w-6 text-center">{qty}</span>
          <button className="h-14 w-11" onClick={() => setQty((q) => Math.min(left ?? 10, q + 1, 20))} aria-label="Increase quantity">+</button>
        </div>
        <button
          className="btn-primary h-14 flex-1"
          onClick={() => {
            if (!size) return setErr("Please choose a size");
            add({ kind: "product", productId: product.id, slug: product.slug, name: product.name, image: product.image, style: product.style, colorName: color.name, colorHex: color.hex, size, qty, unitPrice: unit });
          }}
        >
          Add to cart
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-400" role="alert">{err}</p>}
      {product.customizable && (
        <Link href={`/studio?product=${product.slug}&color=${color.hex.slice(1)}`} className="btn-accent mt-3 h-14 w-full">
          Customize this hoodie
        </Link>
      )}
    </div>
  );
}
