import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_ACCOUNT = ["/account/login", "/account/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // CSRF defence for cookie-authenticated APIs: state-changing requests must come from our own origin.
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(method) && pathname !== "/api/stripe/webhook") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let sameOrigin = false;
    try {
      sameOrigin = !!origin && new URL(origin).host === host;
    } catch {
      sameOrigin = false; // e.g. "Origin: null" from sandboxed frames
    }
    if (!sameOrigin) {
      return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    }
  }

  const needsAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const needsUser = pathname.startsWith("/account") && !PUBLIC_ACCOUNT.includes(pathname);
  if (!needsAdmin && !needsUser) return NextResponse.next();

  // Fast pre-check. Every admin page/route re-validates the role against the database.
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session || (needsAdmin && session.role !== "ADMIN")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = session ? "/" : "/account/login";
    url.search = session ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/api/:path*"] };
