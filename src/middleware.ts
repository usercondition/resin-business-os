import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Shop session and role checks run in API route handlers (`requireAuth` / `requireRole`).
 * This middleware no longer redirects the admin UI to `/login` in production.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  /** Skip API + static so the Edge middleware never runs on `/api/*` (avoids spurious 500s on some hosts). */
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
