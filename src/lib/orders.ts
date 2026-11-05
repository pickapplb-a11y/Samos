import "server-only";
import { randomBytes } from "crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { getPricing } from "./settings";
import { priceCustom, deliveryFee, type PriceLine } from "./design/pricing";
import { ZONES, SIZES, type ZoneId } from "./design/zones";
import type { Layer } from "./design/schema";
import { HttpError } from "./http";

export const cartItemSchema = z.object({
  kind: z.enum(["product", "custom"]),
  productId: z.string().max(40).optional(),
  designId: z.string().max(40).optional(),
  revision: z.number().int().positive().optional(),
  size: z.enum(SIZES),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  qty: z.number().int().min(1).max(20),
});
export const quoteSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(30),
  promo: z.string().trim().toUpperCase().max(40).optional().or(z.literal("")),
  delivery: z.enum(["standard", "express"]).default("standard"),
  payment: z.enum(["COD", "CARD"]).default("COD"),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export interface PricedItem {
  kind: "product" | "custom";
  productId: string | null;
  designId: string | null;
  name: string;
  image: string;
  style: "OVERSIZED" | "REGULAR" | "ZIP";
  size: string;
  colorName: string;
  colorHex: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  breakdown: PriceLine[];
  variantId: string | null;
  designSnapshot: Prisma.InputJsonValue | null;
  printFiles: Record<string, string> | null;
  previewId: string | null;
}

/** Authoritative pricing. Never trusts prices sent by the browser. */
export async function priceCart(input: QuoteInput, who: { user: CurrentUser | null; guestId: string | null }) {
  const cfg = await getPricing();
  const items: PricedItem[] = [];
  const problems: string[] = [];

  for (const it of input.items) {
    const sizeUp = cfg.sizeUpcharge[it.size] ?? 0;
    if (it.kind === "product") {
      const p = it.productId ? await db.product.findFirst({ where: { id: it.productId, active: true }, include: { colors: true } }) : null;
      const color = p?.colors.find((c) => c.hex.toLowerCase() === it.colorHex.toLowerCase());
      if (!p || !color) {
        problems.push("An item in your cart is no longer available");
        continue;
      }
      const v = await db.variant.findUnique({ where: { productId_colorHex_size: { productId: p.id, colorHex: color.hex, size: it.size } } });
      if (!v || v.stock < it.qty) {
        problems.push(`${p.name} (${color.name}, ${it.size}) has only ${v?.stock ?? 0} left`);
        continue;
      }
      const breakdown = [{ label: p.name, amount: p.basePrice }, ...(sizeUp ? [{ label: `Size ${it.size}`, amount: sizeUp }] : [])];
      const unit = p.basePrice + sizeUp;
      items.push({ kind: "product", productId: p.id, designId: null, name: p.name, image: p.images[0] ?? "/products/placeholder.svg", style: p.style, size: it.size, colorName: color.name, colorHex: color.hex, qty: it.qty, unitPrice: unit, lineTotal: unit * it.qty, breakdown, variantId: v.id, designSnapshot: null, printFiles: null, previewId: null });
    } else {
      const d = it.designId ? await db.design.findUnique({ where: { id: it.designId } }) : null;
      const owns = d && ((who.user && d.userId === who.user.id) || (!d.userId && who.guestId && d.guestId === who.guestId));
      if (!d || !owns) {
        problems.push("A custom design in your cart could not be found — please re-add it from the studio");
        continue;
      }
      if (it.revision && it.revision !== d.revision) {
        problems.push(`"${d.name}" was edited after it was added — please add the latest version from the studio`);
        continue;
      }
      const layers = d.layers as unknown as Layer[];
      const used = [...new Set(layers.filter((l) => l.visible !== false).map((l) => l.zone as ZoneId))];
      const renders = (d.renders ?? {}) as Record<string, string>;
      if (!used.length || used.some((z) => !renders[z])) {
        problems.push(`Print files for "${d.name}" are missing — open it in the studio and add it to the cart again`);
        continue;
      }
      const product = d.productId ? await db.product.findFirst({ where: { id: d.productId, active: true } }) : null;
      let variantId: string | null = null;
      if (product) {
        const v = await db.variant.findUnique({ where: { productId_colorHex_size: { productId: product.id, colorHex: d.colorHex, size: it.size } } });
        if (v && v.stock < it.qty) {
          problems.push(`${product.name} blank (${d.colorName}, ${it.size}) has only ${v.stock} left`);
          continue;
        }
        variantId = v?.id ?? null;
      }
      const priced = priceCustom(cfg, { style: d.style, layers, size: it.size, baseOverride: product?.basePrice ?? null });
      const snapshot = {
        designId: d.id,
        revision: d.revision,
        name: d.name,
        style: d.style,
        colorHex: d.colorHex,
        colorName: d.colorName,
        layers: layers as unknown as Prisma.InputJsonValue,
        zones: Object.fromEntries(used.map((z) => [z, { ...ZONES[d.style][z] }])) as unknown as Prisma.InputJsonValue,
        priceLines: priced.lines as unknown as Prisma.InputJsonValue,
      } satisfies Prisma.InputJsonObject;
      items.push({
        kind: "custom",
        productId: product?.id ?? null,
        designId: d.id,
        name: d.name === "Untitled design" ? "Custom hoodie" : d.name,
        image: d.previewId ? `/api/assets/${d.previewId}` : "/products/placeholder.svg",
        style: d.style,
        size: it.size,
        colorName: d.colorName,
        colorHex: d.colorHex,
        qty: it.qty,
        unitPrice: priced.total,
        lineTotal: priced.total * it.qty,
        breakdown: priced.lines,
        variantId,
        designSnapshot: snapshot,
        printFiles: Object.fromEntries(used.map((z) => [z, renders[z]])),
        previewId: d.previewId,
      });
    }
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  let discount = 0;
  let discountCode: string | null = null;
  let promoError: string | null = null;
  if (input.promo) {
    const dc = await db.discount.findUnique({ where: { code: input.promo } });
    if (!dc || !dc.active || (dc.expiresAt && dc.expiresAt < new Date()) || (dc.maxUses != null && dc.uses >= dc.maxUses)) promoError = "This promo code is not valid";
    else if (subtotal < dc.minSubtotal) promoError = `This code needs a subtotal of at least $${(dc.minSubtotal / 100).toFixed(2)}`;
    else {
      discount = dc.type === "PERCENT" ? Math.round((subtotal * Math.min(100, dc.value)) / 100) : Math.min(subtotal, dc.value);
      discountCode = dc.code;
    }
  }
  const delivery = items.length ? deliveryFee(cfg, input.delivery, subtotal - discount) : 0;
  const codFee = input.payment === "COD" && items.length ? cfg.codFee : 0;
  const total = Math.max(0, subtotal - discount) + delivery + codFee;
  return { items, problems, subtotal, discount, discountCode, promoError, delivery, codFee, total, freeOver: cfg.delivery.freeOver };
}

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30).regex(/^[+()\d\s-]+$/, "Invalid phone number"),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  region: z.string().trim().max(60).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(60),
});

export const orderSchema = quoteSchema.extend({
  email: z.string().trim().toLowerCase().email().max(120),
  address: addressSchema,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  saveAddress: z.boolean().optional(),
});

export function newOrderNumber() {
  return `VN-${Date.now().toString(36).toUpperCase().slice(-6)}${randomBytes(2).toString("hex").toUpperCase()}`;
}

/** Create the order atomically: stock reservation, discount usage, frozen design snapshots. */
export async function createOrder(input: z.infer<typeof orderSchema>, who: { user: CurrentUser | null; guestId: string | null }) {
  const q = await priceCart(input, who);
  if (q.problems.length) throw new HttpError(409, q.problems[0]);
  if (!q.items.length) throw new HttpError(400, "Your cart is empty");
  if (input.promo && q.promoError) throw new HttpError(422, q.promoError);

  return db.$transaction(async (tx) => {
    for (const it of q.items) {
      if (!it.variantId) continue;
      const r = await tx.variant.updateMany({ where: { id: it.variantId, stock: { gte: it.qty } }, data: { stock: { decrement: it.qty } } });
      if (r.count === 0) throw new HttpError(409, `${it.name} (${it.size}) just sold out`);
    }
    if (q.discountCode) {
      const dc = await tx.discount.findUnique({ where: { code: q.discountCode } });
      const r = await tx.discount.updateMany({ where: { code: q.discountCode, ...(dc?.maxUses != null ? { uses: { lt: dc.maxUses } } : {}) }, data: { uses: { increment: 1 } } });
      if (r.count === 0) throw new HttpError(409, "This promo code has just reached its limit");
    }
    const order = await tx.order.create({
      data: {
        number: newOrderNumber(),
        accessToken: randomBytes(24).toString("hex"),
        userId: who.user?.id ?? null,
        email: input.email,
        phone: input.address.phone,
        paymentMethod: input.payment,
        paymentStatus: input.payment === "CARD" ? "PENDING" : "UNPAID",
        subtotal: q.subtotal,
        deliveryFee: q.delivery,
        codFee: q.codFee,
        discount: q.discount,
        total: q.total,
        discountCode: q.discountCode,
        deliveryMethod: input.delivery,
        shipping: input.address,
        notes: input.notes || null,
        items: {
          create: q.items.map((i) => ({
            productId: i.productId,
            designId: i.designId,
            name: i.name,
            style: i.style,
            size: i.size,
            colorName: i.colorName,
            colorHex: i.colorHex,
            quantity: i.qty,
            unitPrice: i.unitPrice,
            design: i.designSnapshot ?? undefined,
            printFiles: i.printFiles ?? undefined,
            previewId: i.previewId,
          })),
        },
        events: { create: { status: "PENDING", note: input.payment === "COD" ? "Order placed — cash on delivery" : "Order placed — awaiting card payment", actor: "system" } },
      },
    });
    for (const it of q.items) if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { popularity: { increment: it.qty } } });
    if (who.user && input.saveAddress) {
      const exists = await tx.address.findFirst({ where: { userId: who.user.id, line1: input.address.line1, city: input.address.city } });
      if (!exists) {
        const count = await tx.address.count({ where: { userId: who.user.id } });
        await tx.address.create({ data: { ...input.address, line2: input.address.line2 || null, region: input.address.region || null, postalCode: input.address.postalCode || null, userId: who.user.id, isDefault: count === 0 } });
      }
    }
    return { order, quote: q };
  });
}

/** Undo stock + discount reservation (failed/expired card payment or cancellation). */
export async function releaseOrder(orderId: string) {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!o) return;
  await db.$transaction(async (tx) => {
    for (const it of o.items) {
      if (!it.productId) continue;
      await tx.variant.updateMany({ where: { productId: it.productId, colorHex: it.colorHex, size: it.size }, data: { stock: { increment: it.quantity } } });
    }
    if (o.discountCode) await tx.discount.updateMany({ where: { code: o.discountCode, uses: { gt: 0 } }, data: { uses: { decrement: 1 } } });
  });
}
