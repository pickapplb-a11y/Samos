import Link from "next/link";
import LegalPage from "@/components/layout/LegalPage";
export const metadata = { title: "FAQ", description: "Answers about custom hoodies, sizing, printing, delivery and returns.", alternates: { canonical: "/faq" } };
const QA: [string, React.ReactNode][] = [
  ["How accurate is the 3D preview?", "Very. Every print area in the studio is mapped to its real size on the garment, so a 10″ graphic in the studio is printed 10″ wide. We print from the exact 300 DPI file generated from your design."],
  ["What files can I upload?", "PNG, JPG and SVG up to 15 MB. Transparent PNGs or SVGs give the cleanest results. For sharp prints use at least 300 DPI at the printed size."],
  ["Can I print on the sleeves and back?", "Yes. Front, back, left sleeve and right sleeve are all printable, and you can use any combination. Zip-ups have a left-chest print area on the front because of the zipper."],
  ["Do I need an account?", <>No, guest checkout is available. An account lets you save designs, track orders and reorder in one click. Designs you make as a guest are moved to your account when you sign in.</>],
  ["How long will my order take?", <>Custom pieces ship in 2–4 business days, plus delivery time. See <Link href="/shipping-policy">shipping</Link>.</>],
  ["Can I pay cash on delivery?", "Yes. Choose cash on delivery at checkout and pay the courier when your order arrives."],
  ["Can I return a custom hoodie?", <>Custom pieces can&apos;t be returned for size or change of mind, but misprints and faults are always reprinted or refunded. See <Link href="/returns">returns</Link>.</>],
  ["How do I wash it?", "Inside out, cold water, low tumble dry or hang dry. Don't iron directly on the print."],
  ["Which size should I choose?", <>Our Oversized fit is intentionally roomy. Check the <Link href="/size-guide">size guide</Link> and compare it with a hoodie you love.</>],
];
export default function Page() {
  return (
    <LegalPage title="FAQ">
      <div className="not-prose divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {QA.map(([q, a]) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">{q}<span className="text-xl text-mist transition group-open:rotate-45">+</span></summary>
            <div className="mt-3 text-white/70">{a}</div>
          </details>
        ))}
      </div>
      <p className="mt-10">Still have questions? <Link href="/contact">Contact the studio</Link>.</p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: QA.filter(([, a]) => typeof a === "string").map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
    </LegalPage>
  );
}
