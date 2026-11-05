"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/store";
import { money } from "@/lib/format";
import { STYLE_LABELS } from "@/lib/design/zones";

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="container-x min-h-[60vh] pt-28" />;
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return (
    <div className="container-x pt-28">
      <h1 className="display text-5xl md:text-7xl">Your cart</h1>
      {items.length === 0 ? (
        <div className="card mt-10 grid place-items-center py-24 text-center">
          <p className="text-lg">Your cart is empty.</p>
          <div className="mt-6 flex gap-3"><Link href="/studio" className="btn-accent">Design a hoodie</Link><Link href="/shop" className="btn-ghost">Shop collection</Link></div>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {items.map((i) => (
              <li key={i.key} className="flex gap-5 py-6">
                <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-2xl bg-coal">
                  <Image src={i.image} alt="" fill sizes="112px" className="object-cover" unoptimized={i.image.startsWith("/api/")} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold">{i.slug ? <Link href={`/shop/${i.slug}`}>{i.name}</Link> : i.name}</p>
                      <p className="mt-1 text-sm text-mist">{i.kind === "custom" && <span className="mr-1 rounded bg-blaze/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blaze">Custom</span>}{STYLE_LABELS[i.style]} · {i.colorName} · Size {i.size}</p>
                    </div>
                    <p className="font-semibold">{money(i.unitPrice * i.qty)}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-4 pt-4">
                    <div className="flex h-10 items-center rounded-full border border-white/15">
                      <button className="h-10 w-10" onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease quantity">−</button>
                      <span className="w-6 text-center text-sm">{i.qty}</span>
                      <button className="h-10 w-10" onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase quantity">+</button>
                    </div>
                    {i.kind === "custom" && i.designId && <Link href={`/studio?design=${i.designId}`} className="text-xs text-mist hover:text-white">Edit design</Link>}
                    <button className="text-xs text-mist hover:text-white" onClick={() => remove(i.key)}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="card h-fit p-6">
            <h2 className="text-lg font-semibold">Summary</h2>
            <div className="mt-4 flex justify-between text-sm"><span className="text-mist">Subtotal (estimate)</span><span>{money(subtotal)}</span></div>
            <p className="mt-2 text-xs text-mist">Delivery, promo codes and final prices are confirmed at checkout.</p>
            <Link href="/checkout" className="btn-accent mt-6 w-full">Checkout</Link>
            <Link href="/shop" className="btn-ghost mt-3 w-full">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
