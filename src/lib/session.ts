// Edge-safe JWT helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "vanta_session";
export const GUEST_COOKIE = "vanta_guest";

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  sub: string;
  role: "CUSTOMER" | "ADMIN";
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .setAudience("session")
    .sign(key());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: "session" });
    return { sub: String(payload.sub), role: payload.role === "ADMIN" ? "ADMIN" : "CUSTOMER" };
  } catch {
    return null;
  }
}

export async function signGuest(id: string) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(id).setAudience("guest").setExpirationTime("90d").sign(key());
}

export async function verifyGuest(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: "guest" });
    return String(payload.sub);
  } catch {
    return null;
  }
}
