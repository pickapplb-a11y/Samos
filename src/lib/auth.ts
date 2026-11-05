import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { GUEST_COOKIE, SESSION_COOKIE, signGuest, signSession, verifyGuest, verifySession } from "./session";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(user: { id: string; role: "CUSTOMER" | "ADMIN" }) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession({ sub: user.id, role: user.role }), { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  // Move anything created as a guest in this browser into the account.
  const guestId = await verifyGuest(jar.get(GUEST_COOKIE)?.value);
  if (guestId) {
    await db.design.updateMany({ where: { guestId, userId: null }, data: { userId: user.id } });
    await db.asset.updateMany({ where: { guestId, ownerId: null }, data: { ownerId: user.id } });
  }
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user, re-read from the database (role changes take effect immediately). */
export async function currentUser() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  return db.user.findUnique({
    where: { id: s.sub },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  });
}
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export async function requireUser(next = "/account") {
  const u = await currentUser();
  if (!u) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect("/account/login?next=/admin");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}

/** Stable anonymous id for guests (signed cookie) so guest uploads/designs stay private to their browser. */
export async function guestId(create = true) {
  const jar = await cookies();
  const existing = await verifyGuest(jar.get(GUEST_COOKIE)?.value);
  if (existing || !create) return existing;
  const id = randomUUID();
  jar.set(GUEST_COOKIE, await signGuest(id), { ...cookieOpts, maxAge: 60 * 60 * 24 * 90 });
  return id;
}

/** Ownership filter for designs/assets: the user's, or this browser's guest items. */
export async function ownerScope() {
  const user = await currentUser();
  const gid = await guestId(!user);
  return { user, guestId: gid };
}
