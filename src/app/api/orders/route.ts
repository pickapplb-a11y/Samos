import { ownerScope } from "@/lib/auth";
import { createOrder, orderSchema, releaseOrder } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { features } from "@/lib/settings";
import { stripe } from "@/lib/stripe";
import { SITE } from "@/lib/site";
import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  if (!(await rateLimit("order", 10, 10 * 60_000))) throw new HttpError(429, "Too many attempts. Please wait a few minutes.");
  const input = orderSchema.parse(await req.json());
  if (input.payment === "CARD" && !features.card()) throw new HttpError(422, "Card payments are not available");
  const who = await ownerScope();
  const { order } = await createOrder(input, who);
  const trackUrl = `/orders/${order.number}?t=${order.accessToken}`;

  if (input.payment === "CARD") {
    // Hosted Stripe Checkout: card details are entered on Stripe and never reach this server.
    const s = stripe()!;
    try {
      const origin = req.headers.get("origin") || SITE.url;
      const session = await s.checkout.sessions.create({
        mode: "payment",
        customer_email: order.email,
        client_reference_id: order.id,
        metadata: { orderId: order.id, number: order.number },
        line_items: [{ quantity: 1, price_data: { currency: (process.env.NEXT_PUBLIC_CURRENCY || "USD").toLowerCase(), unit_amount: order.total, product_data: { name: `${SITE.name} order ${order.number}` } } }],
        success_url: `${origin}${trackUrl}&paid=1`,
        cancel_url: `${origin}/checkout?cancelled=${order.number}`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      });
      await db.order.update({ where: { id: order.id }, data: { stripeSession: session.id } });
      return ok({ number: order.number, redirect: session.url }, { status: 201 });
    } catch (e) {
      await releaseOrder(order.id);
      await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "FAILED", events: { create: { status: "CANCELLED", note: "Payment session could not be created", actor: "system" } } } });
      console.error(e);
      throw new HttpError(502, "Payment provider unavailable, please try again or choose cash on delivery");
    }
  }
  return ok({ number: order.number, redirect: trackUrl }, { status: 201 });
});
