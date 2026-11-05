"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function submitReview(_: unknown, fd: FormData) {
  const user = await currentUser();
  if (!user) return { error: "Please sign in" };
  if (!(await rateLimit("review", 5, 60 * 60_000, user.id))) return { error: "Too many reviews, try later" };
  const parsed = z
    .object({ productId: z.string().max(40), rating: z.coerce.number().int().min(1).max(5), title: z.string().trim().min(2).max(80), body: z.string().trim().min(10).max(1500) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please complete all fields (review at least 10 characters)" };
  const p = await db.product.findUnique({ where: { id: parsed.data.productId } });
  if (!p) return { error: "Product not found" };
  if (await db.review.findFirst({ where: { userId: user.id, productId: p.id } })) return { error: "You've already reviewed this product" };
  const bought = await db.orderItem.findFirst({ where: { productId: p.id, order: { userId: user.id, status: { not: "CANCELLED" } } } });
  await db.review.create({ data: { ...parsed.data, userId: user.id, name: user.name.split(" ")[0] + (user.name.split(" ")[1] ? ` ${user.name.split(" ")[1][0]}.` : ""), verified: !!bought } });
  revalidatePath(`/shop/${p.slug}`);
  return { ok: true };
}
