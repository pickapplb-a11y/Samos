"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/store";
import { money, cn } from "@/lib/format";

interface Quote {
  items: { name: string; image: string; size: string; colorName: string; qty: number; unitPrice: number; lineTotal: number; kind: string }[];
  problems: string[];
  subtotal: number;
  discount: number;
  discountCode: string | null;
  promoError: string | null;
  delivery: number;
  codFee: number;
  total: number;
  freeOver: number;
  cardEnabled: boolean;
}
type Addr = { id?: string; label?: string; fullName: string; phone: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string };
const EMPTY: Addr = { fullName: "", phone: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };

export default function Checkout({ user, addresses }: { user: { name: string; email: string; phone: string | null } | null; addresses: Addr[] }) {
  const { items, clear } = useCart();
  const router = useRouter();
  const sp = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState("");
  const [delivery, setDelivery] = useState<"standard" | "express">("standard");
  const [payment, setPayment] = useState<"COD" | "CARD">("COD");
  const [email, setEmail] = useState(user?.email ?? "");
  const [addr, setAddr] = useState<Addr>(addresses[0] ?? { ...EMPTY, fullName: user?.name ?? "", phone: user?.phone ?? "" });
  const [saveAddress, setSaveAddress] = useState(!addresses.length);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(sp.get("cancelled") ? "Payment was cancelled. You can try again or choose cash on delivery." : "");
  useEffect(() => setMounted(true), []);

  const payload = useMemo(() => items.map((i) => ({ kind: i.kind, productId: i.productId, designId: i.designId, revision: i.revision, size: i.size, colorHex: i.colorHex, qty: i.qty })), [items]);

  const refresh = useCallback(async () => {
    if (!payload.length) return setQuote(null);
    const r = await fetch("/api/cart/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: payload, promo: promoApplied, delivery, payment }) });
    const j = await r.json();
    if (r.ok) setQuote(j);
    else setError(j.error || "Could not price your cart");
  }, [payload, promoApplied, delivery, payment]);
  useEffect(() => { if (mounted) refresh(); }, [mounted, refresh]);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: payload, promo: promoApplied, delivery, payment, email, address: { fullName: addr.fullName, phone: addr.phone, line1: addr.line1, line2: addr.line2, city: addr.city, region: addr.region, postalCode: addr.postalCode, country: addr.country }, notes, saveAddress: !!user && saveAddress }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not place your order");
      clear();
      if (j.redirect.startsWith("http")) window.location.href = j.redirect;
      else router.push(j.redirect);
    } catch (err) {
      setError((err as Error).message);
      refresh();
      setBusy(false);
    }
  }

  if (!mounted) return <div className="container-x min-h-[60vh] pt-28" />;
  if (!items.length)
    return (
      <div className="container-x pt-28 text-center">
        <h1 className="display text-5xl">Checkout</h1>
        <p className="mt-6 text-mist">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-6">Shop now</Link>
      </div>
    );

  const field = (k: keyof Addr, label: string, opts: { required?: boolean; type?: string; auto?: string; span?: boolean } = {}) => (
    <div className={opts.span ? "sm:col-span-2" : ""}>
      <label htmlFor={`a-${k}`} className="label">{label}{opts.required !== false && <span className="text-blaze"> *</span>}</label>
      <input id={`a-${k}`} className="input" required={opts.required !== false} type={opts.type ?? "text"} autoComplete={opts.auto} value={addr[k] ?? ""} onChange={(e) => setAddr((a) => ({ ...a, id: undefined, [k]: e.target.value }))} />
    </div>
  );

  return (
    <form onSubmit={placeOrder} className="container-x grid gap-10 pt-28 lg:grid-cols-[1fr_420px]">
      <div className="space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="display text-5xl md:text-6xl">Checkout</h1>
          {!user && <p className="text-sm text-mist">Checking out as a guest · <Link href="/account/login?next=/checkout" className="text-white underline">Sign in</Link> for saved addresses</p>}
        </div>

        <section aria-labelledby="c-contact">
          <h2 id="c-contact" className="text-lg font-semibold">Contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="email" className="label">Email<span className="text-blaze"> *</span></label>
              <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="mt-1 text-xs text-mist">Used to look up your order and contact you about it. Your tracking link appears right after checkout.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="c-addr">
          <h2 id="c-addr" className="text-lg font-semibold">Delivery address</h2>
          {addresses.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {addresses.map((a) => <button type="button" key={a.id} onClick={() => setAddr(a)} className={cn("chip h-auto py-2 text-left", addr.id === a.id && "chip-on")}><span><b>{a.label}</b> · {a.line1}, {a.city}</span></button>)}
              <button type="button" onClick={() => setAddr({ ...EMPTY, fullName: user?.name ?? "" })} className={cn("chip", !addr.id && "chip-on")}>+ New address</button>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {field("fullName", "Full name", { auto: "name" })}
            {field("phone", "Phone", { type: "tel", auto: "tel" })}
            {field("line1", "Address", { auto: "address-line1", span: true })}
            {field("line2", "Apartment, floor, building", { required: false, auto: "address-line2", span: true })}
            {field("city", "City", { auto: "address-level2" })}
            {field("region", "State / region", { required: false, auto: "address-level1" })}
            {field("postalCode", "Postal code", { required: false, auto: "postal-code" })}
            {field("country", "Country", { auto: "country-name" })}
          </div>
          {user && !addr.id && <label className="mt-4 flex items-center gap-2 text-sm text-white/80"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-[#FF6B00]" /> Save this address to my account</label>}
        </section>

        <section aria-labelledby="c-del">
          <h2 id="c-del" className="text-lg font-semibold">Delivery method</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([["standard", "Standard", "3–6 business days"], ["express", "Express", "1–2 business days"]] as const).map(([v, t, d]) => (
              <label key={v} className={cn("card flex cursor-pointer items-center gap-3 p-4 transition", delivery === v ? "border-blaze" : "hover:border-white/20")}>
                <input type="radio" name="delivery" value={v} checked={delivery === v} onChange={() => setDelivery(v)} className="accent-[#FF6B00]" />
                <span className="flex-1"><span className="block text-sm font-semibold">{t}</span><span className="text-xs text-mist">{d}</span></span>
              </label>
            ))}
          </div>
          {quote && delivery === "standard" && quote.subtotal - quote.discount < quote.freeOver && <p className="mt-2 text-xs text-mist">Add {money(quote.freeOver - (quote.subtotal - quote.discount))} more for free standard delivery.</p>}
        </section>

        <section aria-labelledby="c-pay">
          <h2 id="c-pay" className="text-lg font-semibold">Payment</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={cn("card flex cursor-pointer items-center gap-3 p-4", payment === "COD" ? "border-blaze" : "hover:border-white/20")}>
              <input type="radio" name="payment" checked={payment === "COD"} onChange={() => setPayment("COD")} className="accent-[#FF6B00]" />
              <span><span className="block text-sm font-semibold">Cash on delivery</span><span className="text-xs text-mist">Pay the courier when it arrives{quote?.codFee ? ` · +${money(quote.codFee)}` : ""}</span></span>
            </label>
            <label className={cn("card flex items-center gap-3 p-4", quote?.cardEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-40", payment === "CARD" ? "border-blaze" : "hover:border-white/20")}>
              <input type="radio" name="payment" disabled={!quote?.cardEnabled} checked={payment === "CARD"} onChange={() => setPayment("CARD")} className="accent-[#FF6B00]" />
              <span><span className="block text-sm font-semibold">Card · Apple Pay · Google Pay</span><span className="text-xs text-mist">{quote?.cardEnabled ? "Secure checkout by Stripe — we never see your card" : "Not available yet"}</span></span>
            </label>
          </div>
        </section>

        <section>
          <label htmlFor="notes" className="label">Order notes (optional)</label>
          <textarea id="notes" rows={3} maxLength={500} className="input h-auto py-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, gift note…" />
        </section>
      </div>

      <aside className="h-fit lg:sticky lg:top-24">
        <div className="card p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="mt-5 space-y-4">
            {(quote?.items ?? []).map((i, k) => (
              <li key={k} className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-ink">
                  <Image src={i.image} alt="" fill sizes="64px" className="object-cover" unoptimized={i.image.startsWith("/api/")} />
                  <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-white px-1 text-[10px] font-bold text-ink">{i.qty}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium">{i.name}</p><p className="text-xs text-mist">{i.kind === "custom" ? "Custom · " : ""}{i.colorName} · {i.size}</p></div>
                <p className="text-sm">{money(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          {quote?.problems.map((p) => <p key={p} className="mt-4 rounded-lg bg-red-500/10 p-3 text-xs text-red-300" role="alert">{p}</p>)}
          <div className="mt-6 flex gap-2">
            <label htmlFor="promo" className="sr-only">Promo code</label>
            <input id="promo" className="input h-10 uppercase" placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
            <button type="button" className="btn-ghost btn-sm h-10" onClick={() => setPromoApplied(promo.trim())}>Apply</button>
          </div>
          {quote?.promoError && promoApplied && <p className="mt-2 text-xs text-red-400">{quote.promoError}</p>}
          {quote?.discountCode && <p className="mt-2 text-xs text-blaze">Code {quote.discountCode} applied <button type="button" className="ml-1 text-mist underline" onClick={() => { setPromo(""); setPromoApplied(""); }}>remove</button></p>}
          {quote && (
            <dl className="mt-6 space-y-2 border-t border-white/[0.07] pt-5 text-sm">
              <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
              {quote.discount > 0 && <div className="flex justify-between text-blaze"><dt>Discount</dt><dd>−{money(quote.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-mist">Delivery</dt><dd>{quote.delivery ? money(quote.delivery) : "Free"}</dd></div>
              {quote.codFee > 0 && <div className="flex justify-between"><dt className="text-mist">Cash on delivery fee</dt><dd>{money(quote.codFee)}</dd></div>}
              <div className="flex justify-between border-t border-white/[0.07] pt-3 text-lg font-semibold"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
            </dl>
          )}
          {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-xs text-red-300" role="alert">{error}</p>}
          <button className="btn-accent mt-6 h-14 w-full" disabled={busy || !quote || quote.problems.length > 0 || !quote.items.length}>
            {busy ? "Placing order…" : payment === "CARD" ? "Continue to secure payment" : `Place order · ${quote ? money(quote.total) : ""}`}
          </button>
          <p className="mt-3 text-center text-[11px] text-mist">By placing your order you agree to our <Link href="/terms" className="underline">Terms</Link>, <Link href="/returns" className="underline">Returns</Link> and <Link href="/customization-policy" className="underline">Customization policy</Link>.</p>
        </div>
      </aside>
    </form>
  );
}
