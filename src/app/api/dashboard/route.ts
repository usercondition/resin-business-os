import { NextRequest } from "next/server";

import { handleRouteError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getDashboardMetrics } from "@/server/analytics/dashboard-service";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "dashboard:read", 120, 60_000);
    if (limited) return limited;

    const metrics = await getDashboardMetrics();
    return ok(metrics);
  } catch (error) {
    return handleRouteError(error);
  }
}

