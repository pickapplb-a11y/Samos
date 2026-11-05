import Link from "next/link";
import LegalPage from "@/components/layout/LegalPage";
import { SITE } from "@/lib/site";
export const metadata = { title: "Terms & conditions", alternates: { canonical: "/terms" } };
export default function Page() {
  return (
    <LegalPage title="Terms & conditions" updated="November 2026">
      <p>These terms apply to purchases from {SITE.name} and use of our website and design studio. By placing an order you accept them.</p>
      <h2>Orders & pricing</h2>
      <p>All prices are shown in USD and confirmed at checkout. We may cancel and fully refund an order if a product is unavailable or a price was displayed in error. A contract is formed when we confirm your order.</p>
      <h2>Custom products</h2>
      <p>Custom hoodies are made to your specification. You confirm you own, or have permission to use, every image, logo and text you upload, and that your design does not infringe anyone&apos;s rights or contain unlawful, hateful or explicit content. See our <Link href="/customization-policy">Customization policy</Link>. We may refuse or cancel designs that breach it.</p>
      <h2>Payment</h2>
      <p>We accept cash on delivery and, where available, card payments via Stripe. Cash-on-delivery orders must be paid in full to the courier.</p>
      <h2>Delivery & returns</h2>
      <p>See our <Link href="/shipping-policy">Shipping policy</Link> and <Link href="/returns">Return & refund policy</Link>.</p>
      <h2>Intellectual property</h2>
      <p>The {SITE.name} name, site design, 3D studio and graphics library are our property. You keep ownership of your own artwork and grant us a limited licence to reproduce it solely to fulfil your order, and, only if you choose to share it publicly, to display it on our site.</p>
      <h2>Liability</h2>
      <p>Nothing in these terms limits your statutory consumer rights. Our liability for any order is limited to the price you paid for it.</p>
      <h2>Contact</h2>
      <p>{SITE.address} · <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
    </LegalPage>
  );
}
