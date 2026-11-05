"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import NewsletterForm from "@/components/home/NewsletterForm";

const COLS = [
  { title: "Shop", links: [["All hoodies", "/shop"], ["Oversized", "/shop?style=OVERSIZED"], ["Zip-ups", "/shop?style=ZIP"], ["Design studio", "/studio"]] },
  { title: "Help", links: [["FAQ", "/faq"], ["Shipping", "/shipping-policy"], ["Returns & refunds", "/returns"], ["Track an order", "/orders/track"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy policy", "/privacy"], ["Terms & conditions", "/terms"], ["Customization policy", "/customization-policy"], ["Cookie settings", "/privacy#cookies"]] },
];

export default function Footer() {
  const p = usePathname();
  if (p.startsWith("/admin") || p.startsWith("/studio") || p.startsWith("/render")) return null;
  return (
    <footer className="mt-32 border-t border-white/[0.07] bg-ink">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="font-display text-4xl tracking-[0.12em]">VANTA<span className="text-blaze">.</span></Link>
          <p className="mt-4 max-w-sm text-sm text-mist">Heavyweight hoodies, designed by you in 3D and printed to order in our studio.</p>
          <div className="mt-6 max-w-sm"><NewsletterForm compact /></div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="eyebrow">{c.title}</p>
            <ul className="mt-5 space-y-3">
              {c.links.map(([l, h]) => (
                <li key={h}><Link href={h} className="link-u text-sm text-white/70 hover:text-white">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-x flex flex-col justify-between gap-3 border-t border-white/[0.06] py-6 text-xs text-white/40 sm:flex-row">
        <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
        <p>{SITE.address} · <Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link></p>
      </div>
    </footer>
  );
}
