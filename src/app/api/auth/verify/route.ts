import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError } from "@/lib/api";
import { consumeMagicLinkToken } from "@/server/auth/magic-link-service";
import { createShopSessionToken, SHOP_SESSION_COOKIE, shopSessionCookieOptions } from "@/server/auth/shop-session";

const bodySchema = z.object({
  token: z.string().min(32),
  next: z.string().optional(),
});

function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

/**
 * Exchange a one-time magic link token for an HttpOnly session cookie.
 * Use POST from `/login/verify` so link scanners do not consume the token via GET prefetch.
 */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const { userId, role } = await consumeMagicLinkToken(body.token);
    const session = createShopSessionToken(userId, role);
    const redirectTo = safeNextPath(body.next);
    const res = NextResponse.json({ ok: true, data: { redirectTo } });
    res.cookies.set(SHOP_SESSION_COOKIE, session, shopSessionCookieOptions());
    return res;
  } catch (error) {
    return handleRouteError(error);
  }
}
