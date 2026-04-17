import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";

/** Must match `SHOP_SESSION_COOKIE` in `shop-session.ts` (avoid importing Node crypto into Edge middleware). */
const SHOP_SESSION_COOKIE = "resin_shop_session";

function hasLikelyShopSession(request: NextRequest): boolean {
  const value = request.cookies.get(SHOP_SESSION_COOKIE)?.value;
  return Boolean(value && value.includes(".") && value.length > 48);
}

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/_next")) {
    return true;
  }
  if (pathname.startsWith("/favicon")) {
    return true;
  }
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return true;
  }
  if (pathname.startsWith("/public")) {
    return true;
  }
  if (pathname.startsWith("/portal")) {
    return true;
  }
  if (pathname.startsWith("/api/auth")) {
    return true;
  }
  if (pathname.startsWith("/api/webhooks")) {
    return true;
  }
  if (pathname.startsWith("/api/public")) {
    return true;
  }
  if (pathname.startsWith("/api/portal")) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (env.APP_ENV !== "production") {
    return NextResponse.next();
  }

  if (hasLikelyShopSession(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: { message: "Authentication required" } }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
