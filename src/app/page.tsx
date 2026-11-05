import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { productCardInclude, toCard } from "@/lib/catalog";
import ProductCard from "@/components/shop/ProductCard";
import HeroHoodie from "@/components/home/HeroHoodie";
import Reveal from "@/components/home/Reveal";
import NewsletterForm from "@/components/home/NewsletterForm";
import type { Layer } from "@/lib/design/schema";
import { SITE } from "@/lib/site";

export const revalidate = 300;

const STEPS = [
  ["01", "Pick your base", "Oversized, regular or zip-up. Twelve garment-dyed colours in 480 GSM fleece."],
  ["02", "Make it yours", "Upload artwork, write text, or start from our graphics. Place it on the front, back or sleeves in 3D."],
  ["03", "See it for real", "Rotate, zoom and inspect every print area at true scale before you buy."],
  ["04", "We print & ship", "Every hoodie is printed to order at 300 DPI, quality-checked and shipped in days."],
];

export default async function Home() {
  const [collections, popular, showcase, reviews, hero] = await Promise.all([
    db.collection.findMany({ where: { active: true }, orderBy: { position: "asc" }, include: { products: { select: { product: { select: { slug: true } } } } } }),
    db.product.findMany({ where: { active: true }, orderBy: { popularity: "desc" }, take: 4, include: productCardInclude }),
    db.design.findMany({ where: { isPublic: true }, orderBy: { createdAt: "asc" }, take: 6, include: { user: { select: { name: true } } } }),
    db.review.findMany({ where: { rating: { gte: 4 } }, orderBy: { createdAt: "desc" }, take: 6, distinct: ["name"], include: { product: { select: { name: true, slug: true } } } }),
    db.design.findFirst({ where: { id: "showcase-afterhours", isPublic: true } }),
  ]);
  const by = ["Maya R.", "Jules K.", "Theo A.", "Ines B.", "Noah P.", "Ava L."];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate h-[100svh] min-h-[640px] overflow-hidden" aria-label="Introduction">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_45%,#1d1d1d_0%,#0B0B0B_62%)]" />
        <div className="absolute inset-x-0 bottom-0 top-16 -z-10 md:left-[30%]">
          {hero && <HeroHoodie style={hero.style} color={hero.colorHex} layers={hero.layers as unknown as Layer[]} poster="/products/afterhours-111111-back.webp" />}
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-ink/40 md:bg-gradient-to-r md:from-ink md:via-ink/50 md:to-transparent" />
        <div className="container-x flex h-full flex-col justify-end pb-16 md:justify-center md:pb-0">
          <p className="eyebrow animate-fadeUp">Custom heavyweight hoodies · Printed to order</p>
          <h1 className="display mt-5 max-w-3xl animate-fadeUp text-[clamp(3.4rem,9vw,8.5rem)] [animation-delay:.1s]">
            Don&apos;t just wear it.<br /><span className="text-blaze">Create</span> it.
          </h1>
          <p className="mt-6 max-w-md animate-fadeUp text-lg text-white/70 [animation-delay:.2s]">Your style. Your vision. Your hoodie.</p>
          <div className="mt-9 flex animate-fadeUp flex-wrap gap-3 [animation-delay:.3s]">
            <Link href="/studio" className="btn-accent h-14 px-8">Start designing</Link>
            <Link href="/shop" className="btn-ghost h-14 px-8">Shop collection</Link>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 hidden text-[10px] uppercase tracking-[0.3em] text-white/40 md:block">Real-time 3D preview</div>
      </section>

      {/* MARQUEE */}
      <div className="overflow-hidden border-y border-white/[0.07] bg-coal py-4" aria-hidden>
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-2xl uppercase text-white/80">
          {Array.from({ length: 2 }).flatMap((_, k) => ["480 GSM fleece", "Printed at 300 DPI", "Designed by you", "Free shipping over $150", "12 garment-dyed colours", "Made to order"].map((t) => <span key={`${k}${t}`} className="flex items-center gap-12">{t}<span className="text-blaze">✦</span></span>))}
        </div>
      </div>

      {/* COLLECTIONS */}
      <section className="container-x mt-28" aria-labelledby="col-h">
        <Reveal className="flex items-end justify-between gap-6">
          <div><p className="eyebrow">Featured collections</p><h2 id="col-h" className="display mt-3 text-5xl md:text-7xl">The edit</h2></div>
          <Link href="/shop" className="link-u hidden text-sm text-white/70 hover:text-white sm:block">View all →</Link>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {collections.map((c, i) => (
            <Reveal key={c.id} delay={i * 120}>
              <Link href={`/shop?collection=${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-coal">
                <Image src={c.image} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition duration-[1.2s] ease-out group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
                <div className="absolute inset-x-6 bottom-6">
                  <h3 className="display text-4xl">{c.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{c.subtitle}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blaze">Explore <span className="transition group-hover:translate-x-1">→</span></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-32 bg-coal py-24" aria-labelledby="how-h">
        <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <p className="eyebrow">How customization works</p>
            <h2 id="how-h" className="display mt-3 text-5xl md:text-7xl">From idea<br />to hoodie</h2>
            <p className="mt-6 max-w-sm text-white/60">What you see in the studio is exactly what we print. Every print area is mapped to its real size on the garment.</p>
            <Link href="/studio" className="btn-primary mt-8">Open the studio</Link>
          </Reveal>
          <ol className="grid gap-px overflow-hidden rounded-3xl bg-white/[0.07] sm:grid-cols-2">
            {STEPS.map(([n, t, d], i) => (
              <li key={n} className="bg-coal p-8">
                <Reveal delay={i * 100}>
                  <span className="font-display text-5xl text-blaze/90">{n}</span>
                  <h3 className="mt-6 text-lg font-semibold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist">{d}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* POPULAR */}
      <section className="container-x mt-28" aria-labelledby="pop-h">
        <Reveal className="flex items-end justify-between">
          <div><p className="eyebrow">Interactive previews</p><h2 id="pop-h" className="display mt-3 text-5xl md:text-7xl">Most wanted</h2></div>
          <Link href="/shop?sort=popular" className="link-u hidden text-sm text-white/70 hover:text-white sm:block">Shop all →</Link>
        </Reveal>
        <p className="mt-3 text-sm text-mist">Hover to see the back · tap a colour to switch</p>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {popular.map((p) => <ProductCard key={p.id} p={toCard(p)} />)}
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="container-x mt-32" aria-labelledby="com-h">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Made in the studio</p>
          <h2 id="com-h" className="display mt-3 text-5xl md:text-7xl">Customer creations</h2>
          <p className="mt-4 text-white/60">Designed by our community. Remix any of them into your own.</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {showcase.map((d, i) => (
            <Reveal key={d.id} delay={(i % 3) * 100}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-coal">
                {d.previewId ? <Image src={`/api/assets/${d.previewId}`} alt={`${d.name} hoodie design`} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" /> : <div className="h-full w-full" style={{ background: d.colorHex }} />}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent opacity-90" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2">
                  <div><p className="font-semibold">{d.name}</p><p className="text-xs text-mist">by {by[i] ?? d.user?.name}</p></div>
                  <Link href={`/studio?remix=${d.id}`} className="btn-primary btn-sm shrink-0">Remix</Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="mt-32 overflow-hidden border-y border-white/[0.07] py-24" aria-labelledby="rev-h">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div><p className="eyebrow">Customer reviews</p><h2 id="rev-h" className="display mt-3 text-5xl md:text-7xl">Worn &amp; loved</h2></div>
            <p className="text-sm text-mist"><span className="text-2xl font-semibold text-white">4.8</span> / 5 average from verified buyers</p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 6).map((r, i) => (
              <Reveal key={r.id} delay={(i % 3) * 100}>
                <figure className="card h-full p-7">
                  <div className="text-blaze" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}<span className="text-white/15">{"★".repeat(5 - r.rating)}</span></div>
                  <blockquote className="mt-4"><p className="font-semibold">{r.title}</p><p className="mt-2 text-sm leading-relaxed text-white/65">“{r.body}”</p></blockquote>
                  <figcaption className="mt-6 text-xs text-mist">{r.name}{r.verified && " · Verified buyer"}{r.product && <> · <Link href={`/shop/${r.product.slug}`} className="hover:text-white">{r.product.name}</Link></>}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="container-x mt-28 text-center" aria-labelledby="nl-h">
        <Reveal>
          <p className="eyebrow">The drop list</p>
          <h2 id="nl-h" className="display mx-auto mt-3 max-w-3xl text-5xl md:text-7xl">First access to limited drops</h2>
          <p className="mx-auto mt-4 max-w-md text-white/60">New colourways, artist collabs and studio features. No spam, unsubscribe anytime.</p>
          <div className="mt-8"><NewsletterForm /></div>
        </Reveal>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.svg` }) }} />
    </>
  );
}
