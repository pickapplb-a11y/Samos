"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCart } from "./store";
import { money } from "@/lib/format";
import { STYLE_LABELS } from "@/lib/design/zones";

export default function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, setOpen]);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-coal transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
          <h2 className="display text-2xl">Cart</h2>
          <button onClick={() => setOpen(false)} className="text-sm text-mist hover:text-white" aria-label="Close cart">Close</button>
        </div>
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {items.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-mist">Your cart is empty.</p>
              <Link href="/studio" onClick={() => setOpen(false)} className="btn-primary mt-6">Design a hoodie</Link>
            </div>
          )}
          {items.map((i) => (
            <div key={i.key} className="flex gap-4">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-ink">
                <Image src={i.image} alt="" fill sizes="80px" className="object-cover" unoptimized={i.image.startsWith("/api/")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{i.name}</p>
                  <p className="text-sm">{money(i.unitPrice * i.qty)}</p>
                </div>
                <p className="mt-0.5 text-xs text-mist">
                  {i.kind === "custom" ? "Custom · " : ""}
                  {STYLE_LABELS[i.style]} · {i.colorName} · {i.size}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-8 items-center rounded-full border border-white/15">
                    <button className="h-8 w-8 text-white/70 hover:text-white" onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease quantity">−</button>
                    <span className="w-6 text-center text-xs" aria-live="polite">{i.qty}</span>
                    <button className="h-8 w-8 text-white/70 hover:text-white" onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <button className="text-xs text-mist underline-offset-2 hover:text-white hover:underline" onClick={() => remove(i.key)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="border-t border-white/[0.07] px-6 py-6">
            <div className="flex justify-between text-sm"><span className="text-mist">Subtotal</span><span className="font-semibold">{money(subtotal)}</span></div>
            <p className="mt-1 text-xs text-mist">Delivery and promo codes are applied at checkout.</p>
            <Link href="/checkout" onClick={() => setOpen(false)} className="btn-accent mt-5 w-full">Checkout</Link>
            <Link href="/cart" onClick={() => setOpen(false)} className="btn-ghost mt-3 w-full">View cart</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
