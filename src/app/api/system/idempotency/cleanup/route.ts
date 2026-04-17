import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { cleanupExpiredIdempotencyKeys } from "@/server/imports/idempotency-cleanup-service";
import { handleRouteError, ok } from "@/lib/api";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "system:idempotency-cleanup", 10, 60_000);
    if (limited) return limited;

    const result = await cleanupExpiredIdempotencyKeys();
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

