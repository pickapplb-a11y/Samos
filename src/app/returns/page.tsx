import LegalPage from "@/components/layout/LegalPage";
export const metadata = { title: "Return & refund policy", alternates: { canonical: "/returns" } };
export default function Page() {
  return (
    <LegalPage title="Returns & refunds" updated="November 2026">
      <h2>Collection pieces</h2>
      <p>Unworn, unwashed items from our collection can be returned within 30 days of delivery for a full refund or exchange. Start a return from the contact page with your order number.</p>
      <h2>Custom hoodies</h2>
      <p>Because custom pieces are printed to order just for you, they can&apos;t be returned for change of mind or wrong size. Use the size guide and the studio&apos;s true-to-scale preview before ordering.</p>
      <h2>Faulty or misprinted items</h2>
      <p>If anything arrives damaged, faulty, or doesn&apos;t match the design you approved (wrong placement, colour or artwork), contact us within 14 days with photos. We&apos;ll reprint it or refund you in full, including delivery. We keep your approved print files on record, so we can verify and reproduce your design exactly.</p>
      <h2>Refunds</h2>
      <p>Refunds are issued to the original payment method within 5–10 business days of us receiving the return. Cash-on-delivery orders are refunded by bank transfer or store credit. Original delivery fees are non-refundable unless the item was faulty.</p>
    </LegalPage>
  );
}
