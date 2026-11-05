import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { releaseOrder } from "@/lib/orders";
import { fail, ok } from "@/lib/http";

// Signature-verified webhook. The only path that can mark an order as paid.
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return fail(404, "Not configured");
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return fail(400, "Invalid signature");
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const order = await db.order.findFirst({ where: { stripeSession: session.id } });
    if (order && session.payment_status === "paid" && order.paymentStatus !== "PAID" && session.amount_total === order.total) {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID", status: "CONFIRMED", events: { create: { status: "CONFIRMED", note: "Card payment received", actor: "stripe" } } },
      });
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const order = await db.order.findFirst({ where: { stripeSession: session.id } });
    if (order && order.paymentStatus === "PENDING") {
      await releaseOrder(order.id);
      await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED", status: "CANCELLED", events: { create: { status: "CANCELLED", note: "Payment not completed", actor: "stripe" } } } });
    }
  }
  return ok({ received: true });
}
