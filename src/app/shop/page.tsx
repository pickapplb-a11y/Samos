import type { Metadata } from "next";
import { db } from "@/lib/db";
import { searchProducts, toCard, productCardInclude } from "@/lib/catalog";
import ProductCard from "@/components/shop/ProductCard";
import ShopFilters from "@/components/shop/ShopFilters";
import { STUDIO_COLORS, SIZES } from "@/lib/design/zones";

export const metadata: Metadata = { title: "Shop all hoodies", description: "Premium heavyweight hoodies in oversized, regular and zip-up fits. Shop the collection or customise any piece in 3D.", alternates: { canonical: "/shop" } };

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [categories, collection] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    sp.collection ? db.collection.findUnique({ where: { slug: sp.collection }, include: { products: { include: { product: { include: productCardInclude } } } } }) : null,
  ]);
  const products = collection ? collection.products.map((p) => p.product).filter((p) => p.active) : await searchProducts(sp);
  const title = collection?.title ?? categories.find((c) => c.slug === sp.category)?.name ?? (sp.q ? `Results for “${sp.q}”` : "All hoodies");
  return (
    <div className="container-x pt-28">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.07] pb-8">
        <div>
          <p className="eyebrow">Shop</p>
          <h1 className="display mt-3 text-5xl md:text-7xl">{title}</h1>
          {collection?.subtitle && <p className="mt-3 text-white/60">{collection.subtitle}</p>}
        </div>
        <p className="text-sm text-mist" aria-live="polite">{products.length} product{products.length === 1 ? "" : "s"}</p>
      </header>
      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <ShopFilters categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} colors={STUDIO_COLORS.map((c) => c.name)} sizes={[...SIZES]} />
        <section aria-label="Products">
          {products.length === 0 ? (
            <div className="card grid place-items-center py-24 text-center">
              <p className="text-lg font-semibold">No hoodies match those filters</p>
              <p className="mt-2 text-sm text-mist">Try removing a filter — or design exactly what you want.</p>
              <a href="/studio" className="btn-accent mt-6">Design your own</a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
              {products.map((p, i) => <ProductCard key={p.id} p={toCard(p)} priority={i < 3} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
