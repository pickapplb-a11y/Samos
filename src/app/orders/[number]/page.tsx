import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { money, STATUS_LABEL } from "@/lib/format";
import { STYLE_LABELS } from "@/lib/design/zones";
import StatusTimeline from "@/components/orders/StatusTimeline";
import ClearCartOnPaid from "@/components/orders/ClearCartOnPaid";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; paid?: string }> }) {
  const { number } = await params;
  const { t, paid } = await searchParams;
  const [user, order] = await Promise.all([currentUser(), db.order.findUnique({ where: { number }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } })]);
  // Access: the account that placed it, an admin, or the secret link sent to a guest.
  if (!order || !((user && order.userId === user.id) || user?.role === "ADMIN" || (t && t === order.accessToken))) notFound();
  const ship = order.shipping as Record<string, string>;
  const q = t ? `?o=${order.number}&t=${t}` : "";
  return (
    <div className="container-x max-w-5xl pt-28">
      {paid && <ClearCartOnPaid />}
      <p className="eyebrow">Order {order.number}</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">{order.status === "PENDING" && order.paymentStatus !== "PENDING" ? "Thank you — order received" : STATUS_LABEL[order.status]}</h1>
      <p className="mt-3 text-white/60">
        Placed {order.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · {order.paymentMethod === "COD" ? "Cash on delivery" : `Card — ${order.paymentStatus.toLowerCase()}`}
      </p>
      {order.paymentMethod === "CARD" && order.paymentStatus === "PENDING" && <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-white/80">We&apos;re confirming your payment with Stripe. This page updates as soon as it&apos;s confirmed — refresh in a moment.</p>}
      {!user && t && <p className="mt-4 text-sm text-mist">Bookmark this page to track your order. You can also look it up anytime on <Link href="/orders/track" className="text-white underline">Track an order</Link>.</p>}
      <div className="card mt-10 p-6"><StatusTimeline status={order.status} events={order.events} /></div>
      <div className="mt-8 grid gap-8 md:grid-cols-[1.5fr_1fr]">
        <ul className="card divide-y divide-white/[0.07]">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 p-5">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-ink">
                {i.previewId ? <Image src={`/api/assets/${i.previewId}${q}`} alt="" fill sizes="80px" className="object-cover" unoptimized /> : <div className="h-full w-full" style={{ background: i.colorHex }} />}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold">{i.name}</p>
                <p className="mt-1 text-xs text-mist">{i.design ? "Custom · " : ""}{STYLE_LABELS[i.style]} · {i.colorName} · {i.size} · ×{i.quantity}</p>
                {i.design && user && order.userId === user.id && <Link href={`/account/designs`} className="mt-2 inline-block text-xs text-blaze">View in my designs</Link>}
              </div>
              <p className="text-sm">{money(i.unitPrice * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <p className="label">Delivering to</p>
            <p>{ship.fullName}<br />{ship.line1}{ship.line2 && <>, {ship.line2}</>}<br />{ship.city}{ship.region && `, ${ship.region}`} {ship.postalCode}<br />{ship.country}<br /><span className="text-mist">{ship.phone}</span></p>
            <p className="mt-3 text-xs text-mist">{order.deliveryMethod === "express" ? "Express · 1–2 business days" : "Standard · 3–6 business days"} after printing</p>
          </div>
          <dl className="card space-y-2 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-mist">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-blaze"><dt>Discount {order.discountCode}</dt><dd>−{money(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-mist">Delivery</dt><dd>{order.deliveryFee ? money(order.deliveryFee) : "Free"}</dd></div>
            {order.codFee > 0 && <div className="flex justify-between"><dt className="text-mist">COD fee</dt><dd>{money(order.codFee)}</dd></div>}
            <div className="flex justify-between border-t border-white/[0.07] pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
          <Link href="/contact" className="btn-ghost w-full">Need help with this order?</Link>
        </div>
      </div>
    </div>
  );
}
