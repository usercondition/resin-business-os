import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { ok, handleRouteError } from "@/lib/api";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { convertQuoteToApproved, parseConvertQuoteInput } from "@/server/domain/orders/quote-workflow-service";

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "quotes:approve", 80, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = parseConvertQuoteInput(body);

    const quote = await convertQuoteToApproved(parsed.quoteId, parsed.actorUserId ?? actor.userId);

    return ok(quote);
  } catch (error) {
    return handleRouteError(error);
  }
}

