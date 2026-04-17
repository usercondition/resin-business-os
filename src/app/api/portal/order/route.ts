import { NextRequest } from "next/server";

import { fail, handleRouteError, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { PORTAL_SESSION_COOKIE, readPortalSessionFromCookie } from "@/server/portal/portal-session";
import { loadPortalOrderBundle } from "@/server/portal/portal-service";

export async function GET(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "portal:order", 120, 60_000);
    if (limited) {
      return limited;
    }

    const session = readPortalSessionFromCookie(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
    if (!session) {
      return fail("Portal session required", 401);
    }

    const bundle = await loadPortalOrderBundle(session.orderId);
    return ok(bundle);
  } catch (error) {
    return handleRouteError(error);
  }
}
