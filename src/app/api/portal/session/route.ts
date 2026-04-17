import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { fail, handleRouteError, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  createPortalSessionToken,
  PORTAL_SESSION_COOKIE,
  portalCookieOptions,
} from "@/server/portal/portal-session";
import { assertPortalCredentials } from "@/server/portal/portal-service";

const loginSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  orderNumber: z.string().min(4).max(64),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "portal:login", 30, 15 * 60_000);
    if (limited) {
      return limited;
    }

    const body = loginSchema.parse(await request.json());
    const order = await assertPortalCredentials(body.firstName, body.lastName, body.orderNumber);
    const token = createPortalSessionToken(order.id);

    const res = NextResponse.json({ ok: true, data: { orderNumber: order.orderNumber } });
    res.cookies.set(PORTAL_SESSION_COOKIE, token, portalCookieOptions());
    return res;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("We could not verify")) {
      return fail(error.message, 401);
    }
    return handleRouteError(error);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, data: { signedOut: true } });
  const opts = portalCookieOptions();
  res.cookies.set(PORTAL_SESSION_COOKIE, "", { ...opts, maxAge: 0 });
  return res;
}
