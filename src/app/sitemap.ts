import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";

// Rendered at request time: the database is not reachable during the hosting build step.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
  const pages = ["", "/shop", "/studio", "/faq", "/contact", "/size-guide", "/shipping-policy", "/returns", "/customization-policy", "/privacy", "/terms"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : p === "/studio" || p === "/shop" ? 0.9 : 0.4 })),
    ...products.map((p) => ({ url: `${SITE.url}/shop/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
