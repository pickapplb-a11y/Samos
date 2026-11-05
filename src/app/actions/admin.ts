"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { releaseOrder } from "@/lib/orders";
import { SIZES } from "@/lib/design/zones";
import { STATUS_LABEL } from "@/lib/format";

type R = { ok?: boolean; error?: string } | null;
const cents = (v: FormDataEntryValue | null) => Math.round(Number(v || 0) * 100);
const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

// ---------- orders ----------
export async function updateOrderStatus(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const status = String(fd.get("status")) as OrderStatus;
  const note = String(fd.get("note") || "").slice(0, 300) || null;
  if (!STATUSES.includes(status)) return;
  const o = await db.order.findUnique({ where: { id } });
  if (!o || o.status === status) return;
  if (status === "CANCELLED" && o.status !== "CANCELLED") await releaseOrder(o.id);
  await db.order.update({
    where: { id },
    data: {
      status,
      // COD orders are paid when delivered
      ...(status === "DELIVERED" && o.paymentMethod === "COD" ? { paymentStatus: "PAID" } : {}),
      events: { create: { status, note, actor: admin.email } },
    },
  });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function setPaymentStatus(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const ps = z.enum(["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"]).parse(fd.get("paymentStatus"));
  await db.order.update({ where: { id }, data: { paymentStatus: ps } });
  revalidatePath(`/admin/orders/${id}`);
}

// ---------- products ----------
const productSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/, "Slug: lowercase letters, numbers and dashes"),
  tagline: z.string().trim().max(120).default(""),
  description: z.string().trim().min(10).max(4000),
  style: z.enum(["OVERSIZED", "REGULAR", "ZIP"]),
  categoryId: z.string().max(40).optional().or(z.literal("")),
  material: z.string().trim().min(2).max(1000),
  fit: z.string().trim().min(2).max(1000),
  care: z.string().trim().min(2).max(1000),
});

export async function saveProduct(_: R, fd: FormData): Promise<R> {
  await requireAdmin();
  const p = productSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const price = cents(fd.get("price"));
  const compareAt = fd.get("compareAt") ? cents(fd.get("compareAt")) : null;
  if (price < 100) return { error: "Price must be at least $1" };
  const images = String(fd.get("images") || "").split("\n").map((s) => s.trim()).filter((s) => /^\/[\w\-./?=&]+$/.test(s) || /^https:\/\//.test(s));
  const colors = String(fd.get("colors") || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.+?)\s*[,|]\s*(#[0-9a-fA-F]{6})$/);
      return m ? { name: m[1].trim().slice(0, 40), hex: m[2].toUpperCase() } : null;
    });
  if (colors.some((c) => !c) || !colors.length) return { error: "Colours: one per line as “Name, #RRGGBB”" };
  const id = String(fd.get("id") || "");
  const data = {
    ...p.data,
    categoryId: p.data.categoryId || null,
    basePrice: price,
    compareAt,
    images,
    active: fd.get("active") === "on",
    featured: fd.get("featured") === "on",
    customizable: fd.get("customizable") === "on",
  };
  const clash = await db.product.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } });
  if (clash) return { error: "Another product uses this slug" };
  const product = id ? await db.product.update({ where: { id }, data }) : await db.product.create({ data });
  // colours + make sure a variant exists for every colour/size
  await db.productColor.deleteMany({ where: { productId: product.id } });
  await db.productColor.createMany({ data: colors.map((c, i) => ({ productId: product.id, name: c!.name, hex: c!.hex, position: i })) });
  for (const c of colors)
    for (const s of SIZES) {
      const sku = `${product.slug.slice(0, 12).toUpperCase()}-${c!.hex.slice(1)}-${s}`;
      await db.variant.upsert({ where: { productId_colorHex_size: { productId: product.id, colorHex: c!.hex, size: s } }, update: {}, create: { productId: product.id, colorHex: c!.hex, size: s, sku: `${sku}-${product.id.slice(-4)}`, stock: 0 } });
    }
  revalidatePath("/admin/products");
  revalidatePath(`/shop/${product.slug}`);
  if (!id) redirect(`/admin/products/${product.id}?created=1`);
  return { ok: true };
}

export async function saveInventory(fd: FormData) {
  await requireAdmin();
  const productId = String(fd.get("productId"));
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("stock:")) continue;
    const n = Math.max(0, Math.min(100000, Math.floor(Number(v) || 0)));
    await db.variant.updateMany({ where: { id: k.slice(6), productId }, data: { stock: n } });
  }
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteProduct(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const used = await db.orderItem.count({ where: { productId: id } });
  // Keep order history intact: archive products that were ordered, delete the rest.
  if (used) await db.product.update({ where: { id }, data: { active: false } });
  else await db.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

// ---------- pricing ----------
export async function savePricing(_: R, fd: FormData): Promise<R> {
  await requireAdmin();
  const n = (k: string) => cents(fd.get(k));
  const value = {
    studioBase: { OVERSIZED: n("base.OVERSIZED"), REGULAR: n("base.REGULAR"), ZIP: n("base.ZIP") },
    zoneFee: { front: n("zone.front"), back: n("zone.back"), leftSleeve: n("zone.leftSleeve"), rightSleeve: n("zone.rightSleeve") },
    extraLayerFee: n("extraLayerFee"),
    sizeUpcharge: { XXL: n("size.XXL"), "3XL": n("size.3XL") },
    delivery: { standard: n("delivery.standard"), express: n("delivery.express"), freeOver: n("delivery.freeOver") },
    codFee: n("codFee"),
  };
  if (Object.values(value.studioBase).some((v) => v < 100)) return { error: "Base prices must be at least $1" };
  await db.setting.upsert({ where: { key: "pricing" }, update: { value }, create: { key: "pricing", value } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- discounts ----------
export async function saveDiscount(_: R, fd: FormData): Promise<R> {
  await requireAdmin();
  const p = z
    .object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Code: 3–30 letters/numbers"),
      type: z.enum(["PERCENT", "FIXED"]),
      value: z.coerce.number().positive(),
      minSubtotal: z.coerce.number().min(0).default(0),
      maxUses: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
      expiresAt: z.string().optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  if (d.type === "PERCENT" && d.value > 100) return { error: "Percent must be 1–100" };
  const data = { code: d.code, type: d.type, value: d.type === "PERCENT" ? Math.round(d.value) : Math.round(d.value * 100), minSubtotal: Math.round(d.minSubtotal * 100), maxUses: d.maxUses ?? null, expiresAt: d.expiresAt ? new Date(d.expiresAt) : null, active: true };
  try {
    await db.discount.create({ data });
  } catch {
    return { error: "That code already exists" };
  }
  revalidatePath("/admin/discounts");
  return { ok: true };
}
export async function toggleDiscount(fd: FormData) {
  await requireAdmin();
  const d = await db.discount.findUnique({ where: { id: String(fd.get("id")) } });
  if (d) await db.discount.update({ where: { id: d.id }, data: { active: !d.active } });
  revalidatePath("/admin/discounts");
}
export async function deleteDiscount(fd: FormData) {
  await requireAdmin();
  await db.discount.delete({ where: { id: String(fd.get("id")) } }).catch(() => null);
  revalidatePath("/admin/discounts");
}

// ---------- homepage collections ----------
export async function saveCollection(_: R, fd: FormData): Promise<R> {
  await requireAdmin();
  const p = z
    .object({ title: z.string().trim().min(2).max(60), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/), subtitle: z.string().trim().max(120).default(""), image: z.string().trim().regex(/^\/[\w\-./]+$/, "Image must be a site path like /products/x.webp"), position: z.coerce.number().int().min(0).max(99) })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const id = String(fd.get("id") || "");
  const productIds = fd.getAll("productIds").map(String);
  const data = { ...p.data, active: fd.get("active") === "on" };
  const col = id ? await db.collection.update({ where: { id }, data }) : await db.collection.create({ data }).catch(() => null);
  if (!col) return { error: "Slug already in use" };
  await db.collectionProduct.deleteMany({ where: { collectionId: col.id } });
  if (productIds.length) await db.collectionProduct.createMany({ data: productIds.map((productId) => ({ collectionId: col.id, productId })), skipDuplicates: true });
  revalidatePath("/");
  revalidatePath("/admin/collections");
  return { ok: true };
}
export async function deleteCollection(fd: FormData) {
  await requireAdmin();
  await db.collection.delete({ where: { id: String(fd.get("id")) } }).catch(() => null);
  revalidatePath("/");
  revalidatePath("/admin/collections");
}
