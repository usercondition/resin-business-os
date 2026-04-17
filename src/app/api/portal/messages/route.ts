import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, handleRouteError, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { PORTAL_SESSION_COOKIE, readPortalSessionFromCookie } from "@/server/portal/portal-session";
import { createPortalClientMessage } from "@/server/portal/portal-service";

const bodySchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "portal:message", 60, 60_000);
    if (limited) {
      return limited;
    }

    const session = readPortalSessionFromCookie(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
    if (!session) {
      return fail("Portal session required", 401);
    }

    const parsed = bodySchema.parse(await request.json());
    const msg = await createPortalClientMessage(session.orderId, parsed.body);
    return ok({ id: msg.id, createdAt: msg.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
