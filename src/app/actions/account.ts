"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword, endSession, hashPassword, requireUser } from "@/lib/auth";
import { addressSchema } from "@/lib/orders";

type R = { ok?: boolean; error?: string } | null;

export async function updateProfile(_: R, fd: FormData): Promise<R> {
  const u = await requireUser();
  const p = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().max(30).regex(/^[+()\d\s-]*$/, "Invalid phone") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  await db.user.update({ where: { id: u.id }, data: { name: p.data.name, phone: p.data.phone || null } });
  revalidatePath("/account");
  return { ok: true };
}

export async function changePassword(_: R, fd: FormData): Promise<R> {
  const u = await requireUser();
  const current = String(fd.get("current") || "");
  const next = String(fd.get("next") || "");
  if (next.length < 10 || !/\d/.test(next) || !/[a-zA-Z]/.test(next)) return { error: "New password must be 10+ characters with letters and a number" };
  const row = await db.user.findUnique({ where: { id: u.id } });
  if (!row || !(await checkPassword(current, row.passwordHash))) return { error: "Current password is incorrect" };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true };
}

export async function saveAddress(_: R, fd: FormData): Promise<R> {
  const u = await requireUser();
  const raw = Object.fromEntries(fd);
  const p = addressSchema.extend({ label: z.string().trim().min(1).max(30) }).safeParse(raw);
  if (!p.success) return { error: p.error.issues.map((i) => `${i.path[0]}: ${i.message}`)[0] };
  const id = String(raw.id || "");
  const data = { ...p.data, line2: p.data.line2 || null, region: p.data.region || null, postalCode: p.data.postalCode || null };
  const makeDefault = raw.isDefault === "on";
  if (makeDefault) await db.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
  if (id) {
    const r = await db.address.updateMany({ where: { id, userId: u.id }, data: { ...data, ...(makeDefault ? { isDefault: true } : {}) } });
    if (!r.count) return { error: "Address not found" };
  } else {
    const count = await db.address.count({ where: { userId: u.id } });
    if (count >= 10) return { error: "You can save up to 10 addresses" };
    await db.address.create({ data: { ...data, userId: u.id, isDefault: makeDefault || count === 0 } });
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(fd: FormData) {
  const u = await requireUser();
  await db.address.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  revalidatePath("/account/addresses");
}

export async function deleteDesign(fd: FormData) {
  const u = await requireUser();
  await db.design.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  revalidatePath("/account/designs");
}

export async function logout() {
  await endSession();
  redirect("/");
}
