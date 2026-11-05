import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { avgRating, productCardInclude, toCard } from "@/lib/catalog";
import { getPricing } from "@/lib/settings";
import { currentUser } from "@/lib/auth";
import ProductGallery from "@/components/shop/ProductGallery";
import BuyBox from "@/components/shop/BuyBox";
import ProductCard from "@/components/shop/ProductCard";
import ReviewForm from "@/components/shop/ReviewForm";
import { SIZES, STYLE_LABELS, ZONES } from "@/lib/design/zones";
import { money } from "@/lib/format";
import { SITE } from "@/lib/site";

type P = { params: Promise<{ slug: string }> };
const getProduct = (slug: string) =>
  db.product.findFirst({ where: { slug, active: true }, include: { colors: { orderBy: { position: "asc" } }, variants: true, category: true, reviews: { orderBy: { createdAt: "desc" } } } });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return {
    title: p.name,
    description: `${p.tagline}. ${p.description}`.slice(0, 160),
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: p.name, description: p.tagline, images: p.images.slice(0, 1).map((u) => ({ url: u, width: 880, height: 1100 })) },
  };
}

export default async function ProductPage({ params }: P) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const [pricing, related, user] = await Promise.all([
    getPricing(),
    db.product.findMany({ where: { active: true, id: { not: p.id }, OR: [{ categoryId: p.categoryId }, { style: p.style }] }, take: 4, orderBy: { popularity: "desc" }, include: productCardInclude }),
    currentUser(),
  ]);
  const stock = Object.fromEntries(p.variants.map((v) => [`${v.colorHex}|${v.size}`, v.stock]));
  const rating = avgRating(p.reviews);
  const zones = ZONES[p.style];
  const sections = [
    ["Material", p.material],
    ["Fit", p.fit],
    ["Washing instructions", p.care],
    ["Delivery", `Standard delivery ${money(pricing.delivery.standard)} (free over ${money(pricing.delivery.freeOver)}), 3–6 business days. Express ${money(pricing.delivery.express)}, 1–2 business days. Custom pieces are printed to order and ship within 2–4 business days. Cash on delivery available.`],
    ["Customization", p.customizable ? `Customise in the 3D studio. Print areas: ${Object.values(zones).map((z) => `${z.label} ${z.widthIn}″×${z.heightIn}″`).join(" · ")}. Printed at 300 DPI with water-based DTG inks.` : "This piece is sold as designed and is not available for customization."],
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => `${SITE.url}${i}`),
    sku: p.slug,
    brand: { "@type": "Brand", name: SITE.name },
    offers: { "@type": "Offer", priceCurrency: process.env.NEXT_PUBLIC_CURRENCY || "USD", price: (p.basePrice / 100).toFixed(2), availability: p.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${SITE.url}/shop/${p.slug}` },
    ...(p.reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: p.reviews.length } } : {}),
  };

  return (
    <div className="container-x pt-24">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-mist">
        <Link href="/shop" className="hover:text-white">Shop</Link> / {p.category && <><Link href={`/shop?category=${p.category.slug}`} className="hover:text-white">{p.category.name}</Link> / </>}<span className="text-white/80">{p.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <ProductGallery images={p.images.length ? p.images : ["/products/placeholder.svg"]} name={p.name} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{STYLE_LABELS[p.style]} · {p.category?.name}</p>
          <h1 className="display mt-3 text-5xl md:text-6xl">{p.name}</h1>
          <p className="mt-3 text-white/60">{p.tagline}</p>
          {p.reviews.length > 0 && <a href="#reviews" className="mt-3 inline-block text-sm text-mist hover:text-white"><span className="text-blaze">{"★".repeat(Math.round(rating))}</span> {rating.toFixed(1)} · {p.reviews.length} reviews</a>}
          <BuyBox product={{ id: p.id, slug: p.slug, name: p.name, price: p.basePrice, compareAt: p.compareAt, style: p.style, customizable: p.customizable, image: p.images[0] ?? "/products/placeholder.svg" }} colors={p.colors.map((c) => ({ name: c.name, hex: c.hex }))} sizes={[...SIZES]} stock={stock} sizeUpcharge={pricing.sizeUpcharge} />
          <p className="mt-8 text-sm leading-relaxed text-white/70">{p.description}</p>
          <div className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {sections.map(([t, body], i) => (
              <details key={t} className="group py-4" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">{t}<span className="text-mist transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{body}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <section id="reviews" className="mt-28 grid gap-10 lg:grid-cols-[1fr_2fr]" aria-labelledby="reviews-h">
        <div>
          <h2 id="reviews-h" className="display text-5xl">Reviews</h2>
          <p className="mt-3 text-mist">{p.reviews.length ? <><span className="text-3xl font-semibold text-white">{rating.toFixed(1)}</span> / 5 from {p.reviews.length} reviews</> : "No reviews yet."}</p>
          <div className="mt-6"><ReviewForm productId={p.id} signedIn={!!user} /></div>
        </div>
        <ul className="space-y-4">
          {p.reviews.map((r) => (
            <li key={r.id} className="card p-6">
              <div className="flex items-center justify-between"><span className="text-blaze" aria-label={`${r.rating} of 5`}>{"★".repeat(r.rating)}<span className="text-white/15">{"★".repeat(5 - r.rating)}</span></span><time className="text-xs text-mist" dateTime={r.createdAt.toISOString()}>{r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time></div>
              <p className="mt-3 font-semibold">{r.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/65">{r.body}</p>
              <p className="mt-4 text-xs text-mist">{r.name}{r.verified && " · Verified buyer"}</p>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-28" aria-labelledby="rel-h">
          <h2 id="rel-h" className="display text-5xl">You may also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={toCard(r)} />)}</div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
