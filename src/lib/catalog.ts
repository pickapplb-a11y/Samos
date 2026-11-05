import "server-only";
import type { Prisma, HoodieStyle } from "@prisma/client";
import { db } from "./db";

export const productCardInclude = { colors: { orderBy: { position: "asc" } }, category: true, reviews: { select: { rating: true } } } satisfies Prisma.ProductInclude;
export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export interface ShopFilters {
  q?: string;
  category?: string;
  style?: string;
  color?: string;
  size?: string;
  min?: string;
  max?: string;
  sort?: string;
}

export async function searchProducts(f: ShopFilters) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (f.q) where.OR = [{ name: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }, { tagline: { contains: f.q, mode: "insensitive" } }];
  if (f.category) where.category = { slug: f.category };
  if (f.style && ["OVERSIZED", "REGULAR", "ZIP"].includes(f.style)) where.style = f.style as HoodieStyle;
  if (f.color) where.colors = { some: { name: { equals: f.color, mode: "insensitive" } } };
  if (f.size) where.variants = { some: { size: f.size, stock: { gt: 0 } } };
  const min = Number(f.min) * 100;
  const max = Number(f.max) * 100;
  if (min || max) where.basePrice = { ...(min ? { gte: min } : {}), ...(max ? { lte: max } : {}) };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    f.sort === "price-asc" ? { basePrice: "asc" } : f.sort === "price-desc" ? { basePrice: "desc" } : f.sort === "new" ? { createdAt: "desc" } : { popularity: "desc" };
  return db.product.findMany({ where, orderBy, include: productCardInclude });
}

export const avgRating = (r: { rating: number }[]) => (r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0);

/** Plain serialisable props for client cards. */
export function toCard(p: ProductCardData) {
  return {
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    price: p.basePrice,
    compareAt: p.compareAt,
    images: p.images,
    customizable: p.customizable,
    colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
    rating: avgRating(p.reviews),
    reviewCount: p.reviews.length,
    category: p.category?.name ?? null,
  };
}
export type CardProps = ReturnType<typeof toCard>;
