import LegalPage from "@/components/layout/LegalPage";
import { getPricing } from "@/lib/settings";
import { money } from "@/lib/format";
export const metadata = { title: "Shipping policy", alternates: { canonical: "/shipping-policy" } };
export default async function Page() {
  const p = await getPricing();
  return (
    <LegalPage title="Shipping" updated="November 2026">
      <h2>Production time</h2>
      <p>Collection items ship within 1–2 business days. Custom hoodies are printed to order and ship within 2–4 business days after your design passes our design review.</p>
      <h2>Delivery options</h2>
      <ul><li><b>Standard:</b> {money(p.delivery.standard)}, 3–6 business days. Free on orders over {money(p.delivery.freeOver)}.</li><li><b>Express:</b> {money(p.delivery.express)}, 1–2 business days.</li><li><b>Cash on delivery:</b> available for an additional {money(p.codFee)}.</li></ul>
      <h2>Tracking</h2>
      <p>Follow every step, from Pending and Design Review through Printing to Out for Delivery, on your order page or under <a href="/orders/track">Track an order</a>.</p>
      <h2>Failed delivery</h2>
      <p>The courier will attempt delivery twice and contact you by phone. Unclaimed parcels return to our studio; we&apos;ll contact you to rearrange delivery.</p>
    </LegalPage>
  );
}
