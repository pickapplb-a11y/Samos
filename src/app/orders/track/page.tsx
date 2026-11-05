import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = { title: "Track an order", description: "Check the status of your VANTA order." };

async function lookup(fd: FormData) {
  "use server";
  if (!(await rateLimit("track", 10, 15 * 60_000))) redirect("/orders/track?e=limit");
  const number = String(fd.get("number") || "").trim().toUpperCase();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const o = number && email ? await db.order.findFirst({ where: { number, email } }) : null;
  if (!o) redirect("/orders/track?e=nf");
  redirect(`/orders/${o.number}?t=${o.accessToken}`);
}

export default async function Track({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="container-x max-w-lg pt-32">
      <h1 className="display text-5xl">Track an order</h1>
      <p className="mt-3 text-white/60">Enter your order number and the email you used at checkout.</p>
      <form action={lookup} className="mt-8 space-y-4">
        <div><label htmlFor="number" className="label">Order number</label><input id="number" name="number" required placeholder="VN-XXXXXXXX" className="input uppercase" /></div>
        <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" required className="input" /></div>
        {e && <p className="text-sm text-red-400" role="alert">{e === "limit" ? "Too many lookups — try again in a few minutes." : "We couldn't find an order with those details."}</p>}
        <button className="btn-primary w-full">Find my order</button>
      </form>
    </div>
  );
}
